variable "domains" {
  type = list(string)
}

variable "target" {
  type = string
}

variable "aws_region" {
  type = string
}

resource "aws_s3_bucket" "redirect_bucket" {
  for_each = toset(var.domains)

  bucket = each.value

  # Enable the bucket for website hosting without using deprecated block
}

resource "aws_s3_bucket_public_access_block" "public_access_block" {
  for_each = toset(var.domains)

  bucket = aws_s3_bucket.redirect_bucket[each.key].id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "bucket_policy" {
  for_each = toset(var.domains)

  bucket = aws_s3_bucket.redirect_bucket[each.key].id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action    = "s3:GetObject",
        Effect    = "Allow",
        Resource  = "${aws_s3_bucket.redirect_bucket[each.key].arn}/*",
        Principal = "*"
      }
    ]
  })
}

resource "aws_s3_bucket_website_configuration" "website_configuration" {
  for_each = toset(var.domains)

  bucket = aws_s3_bucket.redirect_bucket[each.key].id

  redirect_all_requests_to {
    host_name = var.target
    protocol  = "https"
  }
}

data "aws_route53_zone" "selected" {
  for_each = toset(var.domains)

  name = "${each.value}."
}

resource "aws_route53_record" "root" {
  for_each = toset(var.domains)

  zone_id = data.aws_route53_zone.selected[each.key].zone_id
  name    = each.key
  type    = "A"

  alias {
    name                   = "s3-website.${var.aws_region}.amazonaws.com"  # Corrected to use S3 website endpoint directly
    zone_id                = "Z21DNDUVLTQW6Q"  # Use the correct zone ID for your region
    evaluate_target_health = false
  }
}

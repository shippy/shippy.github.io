module "redirect" {
  source = "./redirect"

  domains = [
    "simonpodhajsky.com",
    "simonpodhajsky.net",
    "simonpodhajsky.cz"
  ]
  
  target = "simon.podhajsky.net"

  aws_region = "eu-central-1"
}

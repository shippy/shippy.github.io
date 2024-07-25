provider "aws" {
    region = "eu-central-1"
}

terraform {
    backend "s3" {
        bucket = "simpod-terraform"
        key = "simon.podhajsky.net/terraform.tfstate"
        region = "eu-central-1"
    }
}
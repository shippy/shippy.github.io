module "redirect" {
  source = "./redirect"

  domains = [
    "simonpodhajsky.com",
    "simonpodhajsky.net",
    "simonpodhajsky.cz",
    "vsedatec.cz",
    "evals.cz"
  ]
  
  target = "simon.podhajsky.net"

  aws_region = "eu-central-1"
}

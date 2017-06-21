jq -s '.' data/*.json | python shrink_distributions.py > distributions.json

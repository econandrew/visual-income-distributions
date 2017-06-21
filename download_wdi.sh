# The tail here is to remove the 3 byte UTF8 byte order mark that the API includes, which d3 dislikes
curl http://api.worldbank.org/countries/all/indicators/SP.POP.TOTL?format=csv | tail -c +4 > population.csv
curl http://api.worldbank.org/countries/all/indicators/NE.CON.TOTL.KD?format=csv | tail -c +4 > fce.csv
curl http://api.worldbank.org/countries/all/indicators/NY.GDP.MKTP.PP.KD?format=csv | tail -c +4 > gdp.csv

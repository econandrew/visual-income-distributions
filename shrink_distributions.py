import json
import sys

j = json.load(sys.stdin)
    
for i in range(len(j)):
    j[i]['distribution']['fy'] = [float('%.6e' % (v)) for v in j[i]['distribution']['fy']]
    j[i]['distribution']['y'] = [float('%.6e' % (v)) for v in j[i]['distribution']['y']]

json.dump(j, sys.stdout)

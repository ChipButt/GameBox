#!/usr/bin/env python3
"""Generate byte-equivalent root pages while preserving existing public URLs."""
import argparse,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
MARKER=r'\n<!-- GameBox source base: preserve the original root URL context\. -->\n<base href="[^"]+">'
p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
errors=[]
for legacy,source in json.loads((ROOT/'tools/entry-points.json').read_text()).items():
    text=(ROOT/source).read_text()
    output,n=re.subn(MARKER,'',text,count=1)
    if n!=1:raise SystemExit(f'Missing source base in {source}')
    if args.check:
        if not (ROOT/legacy).exists() or (ROOT/legacy).read_text()!=output:errors.append(legacy)
    else:(ROOT/legacy).write_text(output)
if errors:raise SystemExit('Outdated entry points: '+', '.join(errors))
print('Compatibility entry points verified.' if args.check else 'Compatibility entry points generated.')

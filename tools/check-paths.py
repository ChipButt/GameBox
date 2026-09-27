#!/usr/bin/env python3
"""Check local document/style/script references, accounting for HTML base URLs."""
import json,re,posixpath,urllib.parse
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parent.parent
moves=json.loads((ROOT/'tools/file-moves.json').read_text())
origins={new:old for old,new in moves.items()}
exceptions=json.loads((ROOT/'tools/known-missing-paths.json').read_text()) if (ROOT/'tools/known-missing-paths.json').exists() else []
missing=set();checked=set()
def check(ref,base):
    ref=ref.strip()
    if not ref or ref.startswith(('#','/','data:','blob:','http:','https:','mailto:','javascript:')) or any(c in ref for c in '${}<>\n'):return
    path=urllib.parse.unquote(urllib.parse.urlsplit(ref).path)
    if not path:return
    resolved=posixpath.normpath(posixpath.join(base,path))
    if (ROOT/resolved).exists():checked.add(resolved)
    else:missing.add(resolved)
class Page(HTMLParser):
    def __init__(self,f):super().__init__();self.base=posixpath.dirname(f)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='base':self.base=posixpath.normpath(posixpath.join(self.base,a.get('href','')))
        for k in ('src','href'):
            if k in a and tag!='base':check(a[k],self.base)
# Main/static HTML only: inline templates are checked separately as string literals.
for file in ROOT.rglob('*'):
    if '.git' in file.parts or not file.is_file():continue
    f=file.relative_to(ROOT).as_posix()
    if file.suffix not in ('.html','.css','.js','.mjs'):continue
    text=file.read_text()
    if file.suffix=='.html':
        parser=Page(f);parser.feed(re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',text,flags=re.I));base=parser.base
    elif file.suffix=='.css':base=posixpath.dirname(f)
    else:base=posixpath.dirname(origins.get(f,f))
    # Complete quoted path literals, including JS-generated images and CSS URLs.
    for m in re.finditer(r'''["'`]((?:\.\./|\./)?[\w% /&.\-]+\.(?:png|jpg|webp|css|js|html|webmanifest)(?:\?[^"'`<>\s]*)?)["'`]''',text):
        ref=m.group(1)
        preceding=text[max(0,m.start()-40):m.start()]
        if re.search(r'ASSET_ROOT\s*\+\s*$',preceding):
            root=re.search(r"(?:var|const) ASSET_ROOT\s*=\s*['\"]([^'\"]+)['\"]",text)
            if root:ref=root.group(1)+ref
        elif f=='race-manager/app.js' and re.search(r'asset:\s*$',preceding):
            ref=('assets/tracks/' if 'circuit' in ref else 'assets/cars/')+ref
        check(ref,base)
new=sorted(missing-set(exceptions))
if new:
    print('Missing local references:',json.dumps(new,indent=2));raise SystemExit(1)
print(f'Local paths verified: {len(checked)} targets; {len(missing)} documented pre-existing missing targets.')

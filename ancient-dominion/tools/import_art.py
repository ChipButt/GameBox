#!/usr/bin/env python3
"""Reproducible legal asset import for Ancient Dominion.
Use only the named files, don't silently substitute or manufacture placeholder images.
"""
from pathlib import Path
from urllib.parse import urljoin
from io import BytesIO
import json, os, requests, zipfile
from bs4 import BeautifulSoup
from PIL import Image, ImageOps
ROOT=Path("ancient-dominion/assets")
ROOT.mkdir(parents=True,exist_ok=True)
UA={"User-Agent":"Mozilla/5.0 (compatible; AncientDominionAssetImporter/1.0)"}
sess=requests.Session(); sess.headers.update(UA)
report={}
PAGES={
"house":"https://opengameart.org/content/western-european-medieval-houses-isometric-25d",
"barracks":"https://opengameart.org/content/medieval-barracks-isometric-25d",
"tower":"https://opengameart.org/content/medieval-stone-guard-tower-isometric-25d",
"castle":"https://opengameart.org/content/isometric-25d-western-european-castle",
"stable":"https://opengameart.org/content/isometric-25d-medieval-stable",
"archery":"https://opengameart.org/content/medieval-archery-range-isometric-25d",
"blacksmith":"https://opengameart.org/content/medieval-blacksmith-isometric-25d",
"villager":"https://opengameart.org/content/germanic-worker",
"spearman":"https://opengameart.org/content/germanic-warrior",
"archer":"https://opengameart.org/content/germanic-archer"}
DOWNLOADS=[
("house","house1.png"),("barracks","barracks.png"),
("tower","watchtower_lvl2-exp_full_size.png"),("castle","castle.png"),
("stable","stable.png"),("archery","archery_range.png"),
("blacksmith","blacksmith.png"),("villager","worker.png"),
("spearman","warrior.png"),("archer","archer.png")]
def get(url):
    r=sess.get(url,timeout=90);r.raise_for_status()
    return r.content
def locate(page,filename):
    soup=BeautifulSoup(get(page),"html.parser")
    for a in soup.find_all("a",href=True):
        if a.get_text(" ",strip=True).strip()==filename and "/sites/default/files/" in a["href"]:
            return urljoin(page,a["href"])
    raise RuntimeError("Exact asset link missing: "+page+" "+filename)
for tag,filename in DOWNLOADS:
    url=locate(PAGES[tag],filename)
    data=get(url)
    im=Image.open(BytesIO(data)).convert("RGBA")
    kind="unit" if tag in ("villager","spearman","archer") else "building"
    if kind=="building":
        im.thumbnail((320,245),Image.Resampling.LANCZOS)
        im.save(ROOT/(tag+".png"),optimize=True)
    else:
        # Wyrmsun files use 5 facing directions as columns and movement frames as rows.
        # Some releases have a solid chroma-blue background; key only if it matches corners.
        corner=im.getpixel((0,0))
        if corner[3]==255 and corner[2]>160 and corner[0]<65 and corner[1]>50:
            pix=im.load();w,h=im.size
            for y in range(h):
                for x in range(w):
                    r,g,b,a=pix[x,y]
                    if abs(r-corner[0])<9 and abs(g-corner[1])<9 and abs(b-corner[2])<9:
                        pix[x,y]=(0,0,0,0)
        # Verify alpha after conversion and actual fully transparent pixels.
        assert im.mode=="RGBA" and im.getchannel("A").getextrema()[0]==0
        im.save(ROOT/(tag+".png"),optimize=True)
    report[tag]={"source":PAGES[tag],"download":url,"size":list(im.size),"licence":"CC BY-SA 3.0" if kind=="unit" else "CC0","bytes":(ROOT/(tag+".png")).stat().st_size}
# Large CC0 scenery sheet: retain one representative true-alpha tree cropped from top-left.
treeurl="https://opengameart.org/sites/default/files/trees_01.png"
try:
    im=Image.open(BytesIO(get(treeurl))).convert("RGBA")
    # Primary frames are distributed over the atlas: identify the first occupied block
    # using alpha scanning, and select a crop around the top-left distinct tree.
    mask=im.getchannel("A")
    bb=mask.getbbox()
    if bb:
        # Find the first band of nonempty pixels and a fitting initial tree crop.
        width,height=im.size
        tilew=min(512,width);tileh=min(640,height)
        im=im.crop((0,0,tilew,tileh))
        bb=im.getchannel("A").getbbox()
        if bb: im=im.crop(bb)
        im.thumbnail((170,180),Image.Resampling.LANCZOS)
        im.save(ROOT/"tree.png",optimize=True)
        report["tree"]={"source":"https://opengameart.org/content/isometric-trees-1","size":list(im.size),"licence":"CC0"}
except Exception as exc:
    report["tree_error"]=str(exc)
# Use the open-source Flare grassland terrain sheet for named, real terrain imagery.
# This is separate from rubberduck's large updated pack and is not labelled as his work.
try:
    landurl="https://opengameart.org/sites/default/files/grassland_tiles.png"
    im=Image.open(BytesIO(get(landurl))).convert("RGBA")
    im.thumbnail((2048,2048),Image.Resampling.LANCZOS)
    im.save(ROOT/"terrain-atlas.png",optimize=True)
    report["terrain-atlas"]={"source":"https://opengameart.org/content/grassland-tileset","size":list(im.size),"licence":"See source page (CC-BY-SA; attribution in ASSET_CREDITS.md)"}
except Exception as exc:
    report["terrain_error"]=str(exc)
(ROOT/"manifest.json").write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report,indent=2))

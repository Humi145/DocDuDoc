import re, requests
import argostranslate.package, argostranslate.translate

# 1. Parser le .obo : id -> nom anglais
diseases = {}
cur_id = None
with open("doid.obo", encoding="utf-8") as f:
    for line in f:
        if line.startswith("id: DOID:"):
            cur_id = line.strip()[4:]
        elif line.startswith("name:") and cur_id:
            diseases[cur_id] = line[5:].strip()
            cur_id = None

# 2. Libellés français depuis Wikidata
query = """
SELECT ?doid ?label WHERE {
  ?item wdt:P699 ?doid .
  ?item rdfs:label ?label .
  FILTER(LANG(?label) = "fr")
}"""
r = requests.get("https://query.wikidata.org/sparql",
                 params={"query": query, "format": "json"},
                 headers={"User-Agent": "mon-app/1.0"})
fr = {b["doid"]["value"]: b["label"]["value"]
      for b in r.json()["results"]["bindings"]}

# 3. Fallback : traduction automatique (modèle en -> fr, téléchargé une fois)
argostranslate.package.update_package_index()
pkg = next(p for p in argostranslate.package.get_available_packages()
           if p.from_code == "en" and p.to_code == "fr")
argostranslate.package.install_from_path(pkg.download())

# 4. Écriture du .txt
with open("maladies_fr.txt", "w", encoding="utf-8") as out:
    for doid, name_en in diseases.items():
        name = fr.get(doid) or argostranslate.translate.translate(name_en, "en", "fr")
        out.write(name + "\n")
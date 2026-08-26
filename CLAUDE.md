# Référentiel produits isolants CEE

## Contexte

Ce dépôt contient le référentiel produits CEE (Certificats d'Économie d'Énergie) pour les isolants thermiques.

## Structure du référentiel

Le fichier principal est `Referentiel_produits_2026_corrige.csv` (séparateur `;`, encodage UTF-8).

### 45 colonnes — 8 groupes

| # | Groupe | Colonnes |
|---|--------|----------|
| 1–2 | Identification produit | MARQUE, DESIGNATION PRODUIT |
| 3–4 | Certificat ACERMI | REFERENCE ACERMI, DATE DE VALIDITE ACERMI |
| 5–8 | Norme / Classement feu | NORME, AUTRES CERTIFICATIONS, CLASSEMENT AU FEU, Parement |
| 9–27 | Application fiches CEE | 6 fiches × (Applicable + R/FS ATTENDU + R/FS PRODUIT), + épaisseur pour BAR-EN-106 |
| 28–32 | Cloisons | 5 configurations validées ATec/DTA/ETA |
| 33–41 | Combles / Plafonds / Toitures | 9 configurations |
| 42–44 | Sols et planchers | 3 configurations |
| 45 | Observations | OBSERVATIONS - RECOMMANDATIONS FABRICANT |

### Fiches CEE couvertes et seuils réglementaires fixes

| Fiche | Seuil | Usage |
|-------|-------|-------|
| BAR-EN-106 | R ≥ 1,5 m².K/W | Isolation toiture résidentiel |
| BAT-EN-106 | R ≥ 1,2 m².K/W | Isolation toiture tertiaire |
| BAR-EN-109 | FS ≤ 0,03 (≤ 0,02 à Mayotte) | Réduction apports solaires toiture — France d'outre-mer résidentiel |
| BAT-EN-109 | FS ≤ 0,03 (≤ 0,02 à Mayotte) | Réduction apports solaires toiture — France d'outre-mer tertiaire |
| BAR-EN-107 | R ≥ 0,5 m².K/W | Isolation des murs résidentiel (DOM) — doublage façade/pignon |
| BAT-EN-108 | R ≥ 1,2 m².K/W | Isolation des murs tertiaire (DOM) ≤ 10 000 m² — doublage façade/pignon |

## Documents sources attendus par produit

1. **Certificat ACERMI** *(prioritaire)* — marque, désignation, référence, date validité, R/λ, domaine d'emploi
2. **Avis Technique / DTA / ETA / ATEx CSTB** *(prioritaire)* — domaine d'emploi validé, configurations de pose
3. **PV de classement au feu** *(prioritaire pour colonne feu)* — Euroclasse ou classement M
4. **Attestation d'accréditation COFRAC** *(complémentaire)*
5. **Fiche technique fabricant** *(secondaire, jamais prioritaire)*

## Hiérarchie des sources

1. Documents officiels : ACERMI > ATec/DTA/ETA/ATEx > PV feu > COFRAC
2. Fiche technique fabricant : uniquement si aucun document officiel ne couvre le point
3. Aucune extrapolation : champ sans document = champ vide, signalé "à compléter"

## Règles d'alimentation

- **Colonnes "Applicable"** : `oui` / `non` — ne passe à `oui` que si (a) domaine d'emploi couvert explicitement ET (b) R ou FS produit ≥ seuil fixe de la fiche
- **Seuils R/FS ATTENDU** : valeurs réglementaires constantes, jamais extraites du document produit
- **Configurations de pose** (cloisons/combles/planchers) : `x` uniquement si explicitement validé par ATec/DTA/ETA
- **Doublons** : vérifier l'existence d'une désignation identique ou proche avant création — signaler sans fusionner ni écraser
- **Note sur col. 38** : "Isolant posé sur plafond plaque de plâtre (configuration 2)" est un doublon d'intitulé dans la source — à clarifier avec l'utilisateur avant fusion

## Workflow d'ajout d'un produit

1. Vérifier l'absence de doublon dans le CSV
2. Extraire les données depuis les documents officiels dans l'ordre de priorité
3. Produire la ligne CSV (45 champs, séparateur `;`)
4. Documenter les sources (tableau champ → document → localisation)
5. Lister les champs "à compléter" et les pièces manquantes
6. Signaler les points de vigilance (incohérences, domaines ambigus, validité proche)

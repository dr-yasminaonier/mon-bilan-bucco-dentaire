MON BILAN BUCCO-DENTAIRE — V10

# Mon Bilan Bucco-Dentaire — prototype V1

Cette web-app fonctionne sans installation ni serveur.

## Utilisation rapide
1. Ouvrir `index.html` dans un navigateur.
2. Pour la publier, déposer les 3 fichiers sur un hébergeur statique (Netlify, GitHub Pages, Cloudflare Pages, etc.).
3. Générer ensuite un QR code pointant vers l'adresse publique.

## Fichiers
- `index.html` : structure
- `styles.css` : design
- `app.js` : questionnaire + logique d'orientation

## Important
Le moteur clinique contenu ici est un prototype d’orientation pédagogique.
Avant utilisation publique, faire relire la logique et les formulations par un chirurgien-dentiste diplômé.
Les seuils et combinaisons doivent être validés avant d’être présentés comme recommandations cliniques.


V2 : ajout des blocs infection/gonflement, traumatisme dentaire, mastication, appareils/prothèses et lésions buccales détaillées. La fièvre est désormais évaluée au début du parcours.

V3 :
- questionnaires visuels pour les gencives, les dents et la langue ;
- illustrations schématiques intégrées directement dans l'interface ;
- langage adapté au grand public ;
- les images ne servent pas à diagnostiquer une gingivite/parodontite ;
- les signes visuels sont combinés aux symptômes, au suivi et aux facteurs de risque pour l'orientation.

V4 :
- remplacement des schémas par des illustrations bucco-dentaires réalistes ;
- cartes visuelles pour gencives, dents et langue ;
- mention « Exemple visuel » sur chaque carte ;
- les images restent des repères et ne suffisent pas à poser un diagnostic.

V5 :
- module « dents manquantes » ;
- nombre de dents définitives absentes ;
- cause de la perte/extraction ;
- remplacement par implant, bridge ou prothèse ;
- ancienneté d'une dent non remplacée ;
- combinaison perte par déchaussement + signes gingivaux actifs dans l'orientation ;
- illustrations réalistes dédiées.

V6 :
- remplacement des anciennes illustrations de la section « À quoi ressemblent vos dents actuellement ? »
  par des photos intra-orales beaucoup plus réalistes ;
- ajout d’options visuelles : usure, jaunissement/taches, espaces, mauvais alignement,
  racines visibles, dents absentes, implants, bridge et prothèse amovible ;
- cartes photo plus grandes et meilleure mise en page sur grand écran.

V7 :
- remplacement du module « À quoi ressemble votre langue ? » par des photos réalistes ;
- ajout de repères visuels : dépôt blanc, dépôt jaunâtre, langue rouge, fissurée,
  taches blanches/rouges, gonflement, traces dentaires, langue géographique,
  coloration noirâtre, ulcération, langue pâle et langue chevelue ;
- logique d’orientation adaptée sans transformer les photos en diagnostic.

V8 — questionnaire adaptatif :
- demande si le bilan est réalisé pour soi, son enfant ou une autre personne ;
- lien avec la personne évaluée ;
- sexe (avec possibilité de ne pas répondre) ;
- âge précis en mois avant 3 ans, puis en années ;
- branches dédiées : nourrisson / tout-petit / 3–5 ans / 6–11 ans / adolescent / adulte / senior ;
- pouce et tétine avec questions spécifiques à partir de 3 ans ;
- biberon et exposition nocturne chez les moins de 3 ans ;
- brossage réalisé/assisté/supervisé selon l’âge ;
- dents déjà présentes et âge approximatif de la première dent ;
- denture mixte, premières molaires définitives et scellement des sillons chez les 6–11 ans ;
- freins de langue/lèvre évalués surtout par leurs conséquences fonctionnelles ;
- respiration buccale, ronflement et pauses respiratoires ;
- M’T dents à partir de 3 ans ;
- orthodontie chez l’adolescent ;
- tabac/vape non posé aux enfants, et posé seulement à partir de 15 ans chez l’adolescent ;
- suppression des modules adultes (détartrage, implants/prothèses, dents manquantes anciennes) chez les enfants ;
- résultats et conseils adaptés aux réponses pédiatriques.


NOUVEAUTES V10
- Consentement séparé et facultatif pour la collecte statistique.
- Refus : aucune réponse n'est envoyée à Supabase et le bilan fonctionne normalement.
- Accord : envoi via l'API Supabase vers questionnaire_responses_v2.
- L'âge exact (années/mois) est utilisé localement pour adapter le questionnaire mais n'est pas transmis ; seule la tranche d'âge est conservée.
- Aucune donnée nominative demandée.
- En cas d'échec réseau/Supabase, le résultat reste affiché et utilisable.
- Version enregistrée : V10.

IMPORTANT
La publishable key Supabase est publique par conception. Ne jamais ajouter de secret key, service_role key ou mot de passe de base de données au code du site.

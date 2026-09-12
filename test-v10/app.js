
const APP_VERSION = "V10.1";
const SEMINAR_CODE = "seminaire_2026_11_27_29";
const CONSENT_VERSION = "v2-2026-09";
const SUPABASE_URL = "https://wnhunsumbxjjjypcnaok.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_q-dNYVIHbB-VFXLhtfTHZA_bxfmofji";

const state = {
  answers: {},
  history: [],
  currentId: "consent",
  submitted: false
};

function respondentMode() {
  return state.answers.respondent || "self";
}
function isProxy() {
  return respondentMode() !== "self";
}
function ageYears() {
  const g = state.answers.age_group;
  if (g === "under1" || g === "1_2") return Number(state.answers.age_months || 0) / 12;
  if (state.answers.age_years !== undefined) return Number(state.answers.age_years);
  const fallback = { "3_5": 4, "6_11": 8, "12_17": 15, "18_39": 28, "40_64": 52, "65plus": 70 };
  return fallback[g] ?? 30;
}
function ageMonths() {
  const g = state.answers.age_group;
  if (g === "under1" || g === "1_2") return Number(state.answers.age_months || 0);
  return Math.round(ageYears() * 12);
}
function isUnder6() { return ageYears() < 6; }
function isUnder12() { return ageYears() < 12; }
function isMinor() { return ageYears() < 18; }
function isAdult() { return !isMinor(); }
function isTeen() { return ageYears() >= 12 && ageYears() < 18; }
function subjectWord() {
  if (respondentMode() === "child") return "votre enfant";
  if (respondentMode() === "other") return "la personne que vous accompagnez";
  return "vous";
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function titleFor(selfText, childText, otherText) {
  if (respondentMode() === "child") return childText;
  if (respondentMode() === "other") return otherText || childText.replace(/votre enfant/gi, "la personne");
  return selfText;
}
function afterCommonSafety() {
  return isUnder12() ? "pain_child" : "pain";
}
function afterTeenFollowup() {
  if (isTeen()) return "teen_ortho";
  return "last_scaling";
}
function childAfterDentalVisit() {
  return ageYears() >= 3 ? "mt_dents" : "child_frenulum_known";
}
function childAfterSuction() {
  if (ageYears() < 3) return "child_bottle";
  return "child_suction_changes";
}
function childAfterBottle() {
  return state.answers.child_teeth_present === "yes" ? "child_brush_who" : "child_frenulum_known";
}
function childAfterOralDevelopment() {
  if (ageYears() >= 3) return "child_breathing";
  return "oral_lesion";
}

const q = [
  {
    id: "consent",
    section: "Avant de commencer",
    title: "Avez-vous compris la nature de cet outil ?",
    help: "Il s’agit d’un outil d’information et d’orientation. Il ne pose aucun diagnostic et ne remplace pas un professionnel de santé.",
    type: "single",
    options: [["yes", "Oui, j’ai compris et je souhaite continuer"]],
    next: "study_consent"
  },
  {
    id: "respondent",
    section: "Profil",
    title: "Pour qui réalisez-vous ce bilan bucco-dentaire ?",
    type: "single",
    options: [
      ["self","Pour moi-même"],
      ["child","Pour mon enfant"],
      ["other","Pour une autre personne dont je m’occupe ou que j’accompagne"]
    ],
    next: a => a === "self" ? "gender" : "relationship"
  },
  {
    id: "relationship",
    section: "Profil",
    title: "Quel est votre lien avec la personne évaluée ?",
    type: "single",
    options: [
      ["parent","Parent"],
      ["guardian","Responsable légal"],
      ["caregiver","Aidant / accompagnant"],
      ["other","Autre"]
    ],
    next: "gender"
  },
  {
    id: "gender",
    section: "Profil",
    title: () => titleFor(
      "Quel est votre genre ?",
      "Quel est le genre de votre enfant ?",
      "Quel est le genre de la personne évaluée ?"
    ),
    help: "Cette information est facultative et pourra servir uniquement à décrire les participants de façon statistique.",
    type: "single",
    options: [
      ["woman","Femme / fille"],
      ["man","Homme / garçon"],
      ["nonbinary","Non-binaire / autre"],
      ["prefer_not","Je préfère ne pas répondre"]
    ],
    next: "age_group"
  },
  {
    id: "age_group",
    section: "Profil",
    title: () => titleFor(
      "Dans quelle tranche d’âge êtes-vous ?",
      "Dans quelle tranche d’âge se trouve votre enfant ?",
      "Dans quelle tranche d’âge se trouve la personne évaluée ?"
    ),
    help: "Chez les jeunes enfants, l’âge exact sera demandé en mois afin d’adapter le questionnaire au développement dentaire.",
    type: "single",
    options: [
      ["under1","Moins de 12 mois"],
      ["1_2","12 à 35 mois"],
      ["3_5","3 à 5 ans"],
      ["6_11","6 à 11 ans"],
      ["12_17","12 à 17 ans"],
      ["18_39","18 à 39 ans"],
      ["40_64","40 à 64 ans"],
      ["65plus","65 ans ou plus"]
    ],
    next: a => ["under1","1_2"].includes(a) ? "age_months" : "age_years"
  },
  {
    id: "age_months",
    section: "Profil",
    title: () => respondentMode() === "child" ? "Quel âge a votre enfant en mois ?" : "Quel est l’âge de la personne en mois ?",
    help: "Les premières dents apparaissent souvent au cours de la première année, mais le calendrier varie d’un enfant à l’autre.",
    type: "number",
    min: 0, max: 35,
    next: "redflags"
  },
  {
    id: "age_years",
    section: "Profil",
    title: () => titleFor("Quel âge avez-vous ?", "Quel âge a votre enfant ?", "Quel âge a la personne évaluée ?"),
    type: "number",
    min: 3, max: 110,
    next: "redflags"
  },
  {
    id: "study_consent",
    section: "Participation facultative",
    title: "Acceptez-vous que les réponses de ce bilan soient enregistrées sans nom ni coordonnées pour les statistiques du séminaire ?",
    help: "Ce choix est demandé avant le questionnaire. La participation à la collecte est entièrement facultative : vous pouvez refuser sans conséquence et utiliser le bilan normalement. Aucun nom, e-mail, téléphone ni date de naissance n’est demandé. Si le bilan concerne un mineur, l’autorisation de collecte doit être donnée par son parent ou responsable légal.",
    type: "single",
    options: [
      ["yes", "Oui, j’accepte la collecte de mes réponses pour les statistiques"],
      ["no", "Non, je ne souhaite pas participer à la collecte"]
    ],
    next: "respondent"
  },

  // SOCLE DE SECURITE COMMUN
  {
    id: "redflags",
    section: "Sécurité",
    title: () => titleFor(
      "Présentez-vous actuellement l’un de ces symptômes ?",
      "Votre enfant présente-t-il actuellement l’un de ces symptômes ?",
      "La personne évaluée présente-t-elle actuellement l’un de ces symptômes ?"
    ),
    help: "Plusieurs réponses sont possibles. Ces signes sont prioritaires sur le reste du questionnaire.",
    type: "multi",
    options: [
      ["face_swelling","Gonflement important du visage, de la bouche ou du cou"],
      ["breathing","Difficulté à respirer"],
      ["swallowing","Difficulté à avaler"],
      ["eye_swelling","Gonflement important autour d’un œil ou difficulté à ouvrir l’œil"],
      ["bleeding","Saignement important de la bouche qui ne s’arrête pas"],
      ["major_trauma","Traumatisme important récent du visage ou de la mâchoire"],
      ["trismus","Difficulté importante ou récente à ouvrir la bouche"],
      ["none","Aucun de ces symptômes"]
    ],
    next: "fever"
  },
  {
    id: "fever",
    section: "Sécurité",
    title: () => titleFor("Avez-vous actuellement de la fièvre ?", "Votre enfant a-t-il actuellement de la fièvre ?", "La personne évaluée a-t-elle actuellement de la fièvre ?"),
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas"]],
    next: "infection_swelling"
  },
  {
    id: "infection_swelling",
    section: "Infection / gonflement",
    title: () => titleFor(
      "Avez-vous remarqué un gonflement localisé près d’une dent ou d’une gencive ?",
      "Avez-vous remarqué chez votre enfant un gonflement localisé près d’une dent ou d’une gencive ?",
      "Avez-vous remarqué un gonflement localisé près d’une dent ou d’une gencive chez la personne évaluée ?"
    ),
    type: "single",
    options: [["no","Non"],["yes","Oui"],["unknown","Je ne sais pas"]],
    next: a => a === "yes" ? "infection_details" : afterCommonSafety()
  },
  {
    id: "infection_details",
    section: "Infection / gonflement",
    title: "Ce gonflement présente-t-il l’un de ces signes ?",
    help: "Plusieurs réponses sont possibles.",
    type: "multi",
    options: [
      ["pus","Présence de pus ou écoulement"],
      ["bad_taste","Goût désagréable provenant de la zone"],
      ["growing","Le gonflement augmente"],
      ["painful","La zone est douloureuse"],
      ["none","Aucun de ces signes"],
      ["unknown","Je ne sais pas"]
    ],
    next: () => afterCommonSafety()
  },

  // DOULEUR PEDIATRIQUE
  {
    id: "pain_child",
    section: "Douleur",
    title: () => respondentMode() === "child" ? "Votre enfant semble-t-il avoir mal aux dents ou à la bouche ?" : "La personne évaluée semble-t-elle avoir mal aux dents ou à la bouche ?",
    type: "single",
    options: [["no","Non"],["yes","Oui"],["unknown","Je ne sais pas"]],
    next: a => a === "yes" ? "pain_child_signs" : (isUnder6() ? "child_teeth_present" : "child_dental_signs")
  },
  {
    id: "pain_child_signs",
    section: "Douleur",
    title: "Comment cette douleur se manifeste-t-elle ?",
    help: "Plusieurs réponses sont possibles. Chez un jeune enfant, les comportements peuvent être plus utiles qu’une note sur 10.",
    type: "multi",
    options: [
      ["says_pain","Il/elle dit avoir mal"],
      ["eating","Il/elle se plaint, pleure ou évite de manger"],
      ["night","La douleur semble le/la réveiller la nuit"],
      ["touch","Il/elle évite qu’on touche une zone de la bouche"],
      ["severe","La douleur paraît importante ou difficile à calmer"],
      ["unknown","Je ne sais pas"]
    ],
    next: () => isUnder6() ? "child_teeth_present" : "child_dental_signs"
  },

  // PETITE ENFANCE
  {
    id: "child_teeth_present",
    section: "Développement dentaire",
    title: () => respondentMode() === "child" ? "Votre enfant a-t-il déjà une ou plusieurs dents ?" : "L’enfant évalué a-t-il déjà une ou plusieurs dents ?",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas"]],
    next: a => a === "yes" ? "first_tooth_age" : "child_suction"
  },
  {
    id: "first_tooth_age",
    section: "Développement dentaire",
    title: "À quel âge environ la première dent est-elle apparue ?",
    type: "single",
    options: [
      ["lt4","Avant 4 mois"],
      ["4_6","Entre 4 et 6 mois"],
      ["7_12","Entre 7 et 12 mois"],
      ["gt12","Après 12 mois"],
      ["unknown","Je ne sais pas"]
    ],
    next: "child_dental_signs"
  },
  {
    id: "child_dental_signs",
    section: "Dents",
    title: () => isUnder6() ? "Qu’avez-vous remarqué sur les dents de l’enfant ?" : "À quoi ressemblent actuellement les dents de l’enfant ?",
    help: "Sélectionnez les éléments observés. Les photos sont des repères et ne permettent pas de poser un diagnostic.",
    type: "visual-multi",
    visualGroup: "teeth",
    options: [
      ["normal","Pas d’anomalie visible"],
      ["spots","Taches blanches, jaunes ou brunes inhabituelles"],
      ["cavity","Trou ou zone sombre évoquant une dent abîmée"],
      ["cracked","Dent cassée ou ébréchée"],
      ["yellow","Une dent a changé de couleur"],
      ["misaligned","Dents qui poussent dans une position inhabituelle"],
      ["none","Aucun de ces signes"],
      ["unknown","Je ne sais pas"]
    ],
    next: "dental_trauma"
  },
  {
    id: "dental_trauma",
    section: "Traumatisme dentaire",
    title: () => titleFor(
      "Avez-vous subi récemment un choc sur une dent ou la bouche ?",
      "Votre enfant a-t-il reçu récemment un choc sur une dent ou la bouche ?",
      "La personne évaluée a-t-elle reçu récemment un choc sur une dent ou la bouche ?"
    ),
    type: "single",
    options: [["no","Non"],["yes","Oui"]],
    next: a => {
      if (a === "yes") return isMinor() ? "child_trauma_tooth_type" : "dental_trauma_details";
      if (isUnder6()) return "child_suction";
      if (ageYears() < 12) return "mixed_dentition";
      return isAdult() ? "missing_teeth" : "sensitivity";
    }
  },
  {
    id: "child_trauma_tooth_type",
    section: "Traumatisme dentaire",
    title: "La dent concernée est-elle une dent de lait ou une dent définitive ?",
    type: "single",
    options: [
      ["baby","Dent de lait"],
      ["permanent","Dent définitive"],
      ["unknown","Je ne sais pas"]
    ],
    next: "child_trauma_details"
  },
  {
    id: "child_trauma_details",
    section: "Traumatisme dentaire",
    title: "Que s’est-il passé après le choc ?",
    help: "Plusieurs réponses sont possibles.",
    type: "multi",
    options: [
      ["avulsed","La dent est complètement sortie"],
      ["displaced","La dent s’est déplacée"],
      ["fractured","La dent s’est cassée"],
      ["mobile","La dent bouge"],
      ["bleeding","Saignement autour de la dent"],
      ["darkened","La dent a changé de couleur après le choc"],
      ["none","Aucun de ces signes"],
      ["unknown","Je ne sais pas"]
    ],
    next: "dental_trauma_time"
  },
  {
    id: "dental_trauma_details",
    section: "Traumatisme dentaire",
    title: "Que s’est-il passé après le choc ?",
    help: "Plusieurs réponses sont possibles.",
    type: "multi",
    options: [
      ["avulsed","Une dent définitive a été complètement expulsée"],
      ["displaced","Une dent s’est déplacée"],
      ["fractured","Une dent s’est cassée"],
      ["bleeding","Il y a eu un saignement autour de la dent"],
      ["none","Aucune de ces situations"]
    ],
    next: "dental_trauma_time"
  },
  {
    id: "dental_trauma_time",
    section: "Traumatisme dentaire",
    title: "Quand le choc a-t-il eu lieu ?",
    type: "single",
    options: [
      ["lt1h","Il y a moins d’1 heure"],
      ["1_24h","Il y a moins de 24 heures"],
      ["1_7d","Il y a 1 à 7 jours"],
      ["gt7d","Il y a plus d’une semaine"]
    ],
    next: () => isUnder6() ? "child_suction" : (ageYears() < 12 ? "mixed_dentition" : (isAdult() ? "missing_teeth" : "sensitivity"))
  },

  // SUCCION / BIBERON / DEVELOPPEMENT
  {
    id: "child_suction",
    section: "Habitudes oro-faciales",
    title: "L’enfant a-t-il actuellement une habitude de succion ?",
    type: "single",
    options: [
      ["thumb","Oui, il/elle suce son pouce ou un doigt"],
      ["pacifier","Oui, il/elle utilise une tétine"],
      ["both","Oui, les deux"],
      ["stopped","Il/elle en avait une mais a arrêté"],
      ["none","Non"],
      ["unknown","Je ne sais pas"]
    ],
    next: a => ["thumb","pacifier","both"].includes(a) ? "child_suction_frequency" : (ageYears() < 3 ? "child_bottle" : "child_brush_who")
  },
  {
    id: "child_suction_frequency",
    section: "Habitudes oro-faciales",
    title: "À quelle fréquence cette habitude est-elle présente ?",
    type: "single",
    options: [
      ["sleep","Principalement pour dormir"],
      ["sometimes","Quelques fois dans la journée"],
      ["hours","Plusieurs heures par jour"],
      ["frequent","Très souvent dans la journée et/ou la nuit"],
      ["unknown","Je ne sais pas"]
    ],
    next: () => childAfterSuction()
  },
  {
    id: "child_suction_changes",
    section: "Développement des mâchoires",
    title: "Avez-vous remarqué un changement dans la position des dents ou la fermeture de la bouche ?",
    help: "Cette question n’établit pas de diagnostic orthodontique.",
    type: "multi",
    options: [
      ["upper_forward","Les dents du haut semblent très avancées"],
      ["open_bite","Un espace reste entre les dents du haut et du bas lorsque la bouche est fermée"],
      ["cross_side","Les dents semblent décalées d’un côté"],
      ["lips","L’enfant a du mal à fermer naturellement les lèvres"],
      ["none","Rien de particulier"],
      ["unknown","Je ne sais pas"]
    ],
    next: "child_brush_who"
  },
  {
    id: "child_bottle",
    section: "Alimentation",
    title: "L’enfant utilise-t-il encore un biberon ?",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas"]],
    next: a => a === "yes" ? "child_bottle_when" : childAfterBottle()
  },
  {
    id: "child_bottle_when",
    section: "Alimentation",
    title: "Quand utilise-t-il principalement le biberon ?",
    type: "multi",
    options: [
      ["meal","Pendant les repas"],
      ["between","Entre les repas"],
      ["sleep","Pour s’endormir"],
      ["night","Pendant la nuit"],
      ["other","Autre"],
      ["unknown","Je ne sais pas"]
    ],
    next: "child_bottle_content"
  },
  {
    id: "child_bottle_content",
    section: "Alimentation",
    title: "Que contient habituellement le biberon ?",
    type: "multi",
    options: [
      ["water","Eau"],
      ["milk","Lait"],
      ["juice","Jus"],
      ["sweet","Boisson sucrée"],
      ["other","Autre"],
      ["unknown","Je ne sais pas"]
    ],
    next: () => childAfterBottle()
  },

  // HYGIENE PEDIATRIQUE
  {
    id: "child_brush_who",
    section: "Hygiène",
    title: "Qui réalise ou vérifie habituellement le brossage de l’enfant ?",
    type: "single",
    options: () => isUnder6() ? [
      ["adult","Un adulte brosse les dents"],
      ["child_adult","L’enfant commence et un adulte termine"],
      ["child","L’enfant se brosse principalement seul"],
      ["irregular","Le brossage n’est pas régulier"]
    ] : [
      ["adult","Un adulte brosse les dents"],
      ["child_adult","L’enfant se brosse et un adulte complète"],
      ["supervised","L’enfant se brosse seul mais un adulte vérifie"],
      ["child","L’enfant se brosse entièrement seul"],
      ["none","Personne ne vérifie"]
    ],
    next: "child_brush_frequency"
  },
  {
    id: "child_brush_frequency",
    section: "Hygiène",
    title: "Combien de fois par jour les dents de l’enfant sont-elles brossées ?",
    type: "single",
    options: [
      ["2plus","2 fois par jour ou plus"],
      ["1","1 fois par jour"],
      ["fewweek","Quelques fois par semaine"],
      ["rare","Rarement"],
      ["never","Jamais"]
    ],
    next: "child_fluoride"
  },
  {
    id: "child_fluoride",
    section: "Hygiène",
    title: "Un dentifrice fluoré adapté à l’âge est-il utilisé ?",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas"]],
    next: "child_sugar"
  },
  {
    id: "child_sugar",
    section: "Alimentation",
    title: "En dehors des repas, à quelle fréquence l’enfant consomme-t-il des aliments ou boissons sucrés ?",
    type: "single",
    options: [
      ["rare","Rarement ou jamais"],
      ["1day","Environ 1 fois par jour"],
      ["2_3","2 à 3 fois par jour"],
      ["gt3","Plus de 3 fois par jour"],
      ["unknown","Je ne sais pas"]
    ],
    next: "child_gum_bleeding"
  },
  {
    id: "child_gum_bleeding",
    section: "Gencives",
    title: "Les gencives de l’enfant saignent-elles régulièrement ?",
    type: "single",
    options: [
      ["never","Jamais"],
      ["sometimes","Parfois pendant le brossage"],
      ["often","Souvent"],
      ["spontaneous","Spontanément"],
      ["unknown","Je ne sais pas"]
    ],
    next: "child_gum_signs"
  },
  {
    id: "child_gum_signs",
    section: "Gencives",
    title: "Avez-vous remarqué l’un de ces signes au niveau des gencives ?",
    type: "visual-multi",
    visualGroup: "gums",
    options: [
      ["normal","Aspect habituel"],
      ["red","Gencives rouges"],
      ["swollen","Gencives gonflées"],
      ["pus","Écoulement ou pus"],
      ["tartar","Dépôts visibles près des dents"],
      ["none","Aucun de ces signes"],
      ["unknown","Je ne sais pas"]
    ],
    next: "child_last_dentist"
  },
  {
    id: "child_last_dentist",
    section: "Suivi",
    title: () => respondentMode() === "self" ? "Quand avez-vous consulté un chirurgien-dentiste pour la dernière fois ?" : "Quand l’enfant a-t-il consulté un chirurgien-dentiste pour la dernière fois ?",
    type: "single",
    options: [
      ["lt12","Il y a moins de 12 mois"],
      ["gt12","Il y a plus d’un an"],
      ["never","Jamais"],
      ["unknown","Je ne sais pas"]
    ],
    next: () => childAfterDentalVisit()
  },
  {
    id: "mt_dents",
    section: "Prévention",
    title: () => respondentMode() === "self" ? "Avez-vous bénéficié d’un rendez-vous M’T dents au cours des 12 derniers mois ?" : "L’enfant a-t-il bénéficié de son rendez-vous M’T dents au cours des 12 derniers mois ?",
    type: "single",
    options: [
      ["yes","Oui"],
      ["no","Non"],
      ["unknown_program","Je ne connais pas M’T dents"],
      ["unknown","Je ne sais pas"]
    ],
    next: () => isUnder12() ? "child_frenulum_known" : "teen_ortho"
  },

  // DENTURE MIXTE 6-11
  {
    id: "mixed_dentition",
    section: "Denture mixte",
    title: "Avez-vous remarqué l’une de ces situations ?",
    type: "multi",
    options: [
      ["permanent_behind","Une dent définitive pousse derrière une dent de lait"],
      ["baby_retained","Une dent de lait reste en place alors qu’une nouvelle dent pousse"],
      ["crooked","Une dent définitive semble pousser de travers"],
      ["crowding","Il semble manquer de place pour certaines dents"],
      ["none","Rien de particulier"],
      ["unknown","Je ne sais pas"]
    ],
    next: "six_year_molars"
  },
  {
    id: "six_year_molars",
    section: "Denture mixte",
    title: "Savez-vous si les premières grosses molaires définitives sont déjà sorties tout au fond ?",
    help: "Elles peuvent apparaître derrière les dents de lait sans qu’une dent tombe juste avant.",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas"]],
    next: "sealants"
  },
  {
    id: "sealants",
    section: "Prévention",
    title: "Un chirurgien-dentiste vous a-t-il déjà parlé du scellement des sillons des molaires ?",
    type: "single",
    options: [
      ["done","Oui, cela a été réalisé"],
      ["discussed","Oui, mais pas réalisé"],
      ["no","Non"],
      ["unknown_program","Je ne sais pas ce que c’est"]
    ],
    next: "child_brush_who"
  },

  // FREINS / FONCTIONS PEDIATRIQUES
  {
    id: "child_frenulum_known",
    section: "Freins et fonction",
    title: "Un professionnel de santé a-t-il déjà évoqué un frein de langue ou de lèvre ?",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas"]],
    next: a => a === "yes" ? "child_frenulum_treatment" : "child_frenulum_function"
  },
  {
    id: "child_frenulum_treatment",
    section: "Freins et fonction",
    title: "Une intervention sur un frein a-t-elle déjà été réalisée ou prévue ?",
    type: "single",
    options: [
      ["done","Oui, déjà réalisée"],
      ["planned","Elle est prévue"],
      ["no","Non"],
      ["unknown","Je ne sais pas"]
    ],
    next: "child_frenulum_function"
  },
  {
    id: "child_frenulum_function",
    section: "Freins et fonction",
    title: () => ageYears() < 3 ? "Avez-vous remarqué des difficultés fonctionnelles pendant l’alimentation ?" : "Avez-vous remarqué des difficultés fonctionnelles de la langue ou de l’alimentation ?",
    type: "multi",
    options: () => ageYears() < 3 ? [
      ["feeding","Difficulté à prendre le sein ou le biberon"],
      ["clicking","Claquements/bruits répétés pendant la tétée"],
      ["long","Tétées très longues ou fatigantes"],
      ["leak","Lait qui coule souvent sur les côtés"],
      ["weight","Difficulté de prise de poids signalée par un professionnel"],
      ["none","Aucune difficulté remarquée"],
      ["unknown","Je ne sais pas"]
    ] : [
      ["extend","Difficulté à sortir la langue"],
      ["lift","Difficulté à lever la langue"],
      ["side","Difficulté à déplacer la langue sur les côtés"],
      ["eat","Difficulté à déplacer les aliments dans la bouche"],
      ["speech","Difficulté de parole pour laquelle un professionnel a conseillé une évaluation"],
      ["none","Aucune difficulté remarquée"],
      ["unknown","Je ne sais pas"]
    ],
    next: () => childAfterOralDevelopment()
  },
  {
    id: "child_breathing",
    section: "Respiration et sommeil",
    title: "Avez-vous remarqué l’une de ces situations chez l’enfant ?",
    type: "multi",
    options: [
      ["mouth","Respire souvent par la bouche"],
      ["open_sleep","Dort régulièrement la bouche ouverte"],
      ["snore","Ronfle régulièrement"],
      ["blocked","A souvent le nez bouché"],
      ["lips","A du mal à garder les lèvres fermées au repos"],
      ["none","Aucune de ces situations"],
      ["unknown","Je ne sais pas"]
    ],
    next: vals => Array.isArray(vals) && vals.includes("snore") ? "child_apnea" : "oral_lesion"
  },
  {
    id: "child_apnea",
    section: "Respiration et sommeil",
    title: "Avez-vous déjà observé des pauses dans sa respiration pendant le sommeil ?",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas"]],
    next: "oral_lesion"
  },

  // ADOLESCENT
  {
    id: "teen_ortho",
    section: "Orthodontie",
    title: "L’adolescent porte-t-il actuellement un appareil orthodontique ?",
    type: "single",
    options: [
      ["no","Non"],
      ["fixed","Oui, appareil fixe / bagues"],
      ["aligners","Oui, gouttières"],
      ["removable","Oui, appareil amovible"],
      ["retainer","Oui, contention"],
      ["other","Autre"]
    ],
    next: a => a === "no" ? (ageYears() >= 15 ? "teen_tobacco" : "brush_frequency") : "teen_ortho_hygiene"
  },
  {
    id: "teen_ortho_hygiene",
    section: "Orthodontie",
    title: "Avez-vous remarqué autour de l’appareil l’un de ces signes ?",
    type: "multi",
    options: [
      ["plaque","Dépôts difficiles à retirer"],
      ["red","Gencives rouges"],
      ["bleeding","Saignements"],
      ["white_spots","Taches blanches sur les dents"],
      ["difficulty","Nettoyage difficile autour de l’appareil"],
      ["none","Rien de particulier"],
      ["unknown","Je ne sais pas"]
    ],
    next: () => ageYears() >= 15 ? "teen_tobacco" : "brush_frequency"
  },
  {
    id: "teen_tobacco",
    section: "Facteurs de risque",
    title: "L’adolescent consomme-t-il du tabac ou utilise-t-il une cigarette électronique ?",
    help: "Question facultative, posée uniquement chez les adolescents de 15 ans ou plus.",
    type: "single",
    options: [
      ["no","Non"],
      ["tobacco","Tabac"],
      ["vape","Cigarette électronique"],
      ["both","Les deux"],
      ["prefer_not","Je préfère ne pas répondre"]
    ],
    next: "brush_frequency"
  },

  // PARCOURS 12+ : DOULEUR ET EXAMEN VISUEL
  {
    id: "pain",
    section: "Douleur",
    title: () => titleFor("Ressentez-vous actuellement une douleur au niveau de la bouche, des dents ou des gencives ?", "Votre enfant ressent-il actuellement une douleur au niveau de la bouche, des dents ou des gencives ?", "La personne évaluée ressent-elle actuellement une douleur au niveau de la bouche, des dents ou des gencives ?"),
    type: "single",
    options: [["no","Non"],["yes","Oui"]],
    next: a => a === "yes" ? "pain_location" : "dental_problems"
  },
  {
    id: "pain_location",
    section: "Douleur",
    title: "Où se situe principalement la douleur ?",
    type: "multi",
    options: [
      ["tooth","Une dent"],["teeth","Plusieurs dents"],["gum","Une gencive"],["jaw","La mâchoire"],
      ["wisdom","Autour d’une dent de sagesse"],["other","Une autre zone de la bouche"],["unknown","Difficile à localiser"]
    ],
    next: "pain_scale"
  },
  {
    id: "pain_scale",
    section: "Douleur",
    title: "Quelle est l’intensité de la douleur ?",
    help: "0 = aucune douleur, 10 = pire douleur imaginable.",
    type: "range", min: 0, max: 10, step: 1,
    next: "pain_duration"
  },
  {
    id: "pain_duration",
    section: "Douleur",
    title: "Depuis combien de temps cette douleur est-elle présente ?",
    type: "single",
    options: [
      ["lt24","Moins de 24 heures"],["1_3d","1 à 3 jours"],["4_7d","4 à 7 jours"],
      ["1_4w","1 à 4 semaines"],["gt1m","Plus d’un mois"],["recurrent","Elle apparaît puis disparaît depuis longtemps"]
    ],
    next: "pain_features"
  },
  {
    id: "pain_features",
    section: "Douleur",
    title: "Cette douleur présente-t-elle l’une de ces caractéristiques ?",
    type: "multi",
    options: [
      ["night","Réveille pendant la nuit"],["eating","Gêne fortement pour manger"],["cold","Déclenchée par le froid"],
      ["hot","Déclenchée par le chaud"],["sweet","Déclenchée par le sucre"],["bite","À la mastication"],
      ["lingering","Continue après le chaud ou le froid"],["spontaneous","Apparaît spontanément"],["none","Aucune"]
    ],
    next: "pain_relief"
  },
  {
    id: "pain_relief",
    section: "Douleur",
    title: "La douleur est-elle contrôlée par les antalgiques habituels ?",
    type: "single",
    options: [["none","Aucun antalgique"],["complete","Oui, complètement"],["temporary","Temporairement"],["no","Non"]],
    next: "dental_problems"
  },
  {
    id: "dental_problems",
    section: "Dents",
    title: () => (isTeen() && isProxy()) ? "À quoi ressemblent actuellement les dents de l’adolescent ?" : "À quoi ressemblent vos dents actuellement ?",
    help: "Observez les photos et sélectionnez les situations qui ressemblent le plus à l’état actuel. Les photos servent uniquement de repères.",
    type: "visual-multi",
    visualGroup: "teeth",
    options: () => {
      const base = [
        ["normal","Dents d’aspect habituel, sans anomalie visible"],
        ["cavity","Carie visible / trou ou tache sombre"],
        ["cracked","Dent cassée, fissurée ou ébréchée"],
        ["worn","Dents qui paraissent usées, plus courtes ou aplaties"],
        ["yellow","Dents jaunies ou tachées"],
        ["spaces","Espaces visibles entre plusieurs dents"],
        ["misaligned","Dents qui se chevauchent ou sont mal alignées"],
        ["recession","Racines visibles / dents qui paraissent plus longues"],
        ["mobile","Une ou plusieurs dents définitives qui bougent"],
        ["restoration","Plombage ou couronne abîmé(e), cassé(e) ou décollé(e)"],
        ["missing","Une ou plusieurs dents définitives absentes"]
      ];
      if (isAdult()) base.push(
        ["implant","Un ou plusieurs implants"],
        ["bridge","Un bridge / pont dentaire"],
        ["denture","Une prothèse amovible"]
      );
      base.push(["none","Aucun de ces signes"],["unknown","Je ne sais pas"]);
      return base;
    },
    next: "dental_trauma"
  },

  // ADULTE : DENTS MANQUANTES
  {
    id: "missing_teeth",
    section: "Dents manquantes",
    title: "Vous manque-t-il actuellement une ou plusieurs dents définitives ?",
    help: "Ne comptez pas les dents de sagesse retirées.",
    type: "visual-single", visualGroup: "missing",
    options: [["none","Non"],["one","Oui, 1 dent"],["2_4","Oui, 2 à 4 dents"],["5plus","Oui, 5 dents ou plus"],["unknown","Je ne sais pas"]],
    next: a => ["one","2_4","5plus"].includes(a) ? "missing_reason" : "sensitivity"
  },
  {
    id: "missing_reason",
    section: "Dents manquantes",
    title: "Pourquoi cette ou ces dents ont-elles été perdues ou retirées ?",
    type: "visual-multi", visualGroup: "missing_reason",
    options: [
      ["caries","Carie importante / dent trop abîmée"],["periodontal","Problème de gencives ou déchaussement"],
      ["trauma","Accident ou traumatisme"],["orthodontic","Extraction orthodontique"],["surgery","Autre raison médicale ou chirurgicale"],
      ["agenesis","La dent définitive n’a jamais poussé / était absente"],["unknown","Je ne connais pas la raison"],["other","Autre"]
    ],
    next: "missing_replacement"
  },
  {
    id: "missing_replacement",
    section: "Dents manquantes",
    title: "Les dents absentes ont-elles été remplacées ?",
    type: "visual-single", visualGroup: "replacement",
    options: [["implant","Implant"],["bridge","Bridge"],["denture","Prothèse amovible"],["partial","Certaines seulement"],["no","Non"],["unknown","Je ne sais pas"]],
    next: a => ["no","partial"].includes(a) ? "missing_duration" : "sensitivity"
  },
  {
    id: "missing_duration",
    section: "Dents manquantes",
    title: "Depuis combien de temps manque-t-il au moins une dent non remplacée ?",
    type: "single",
    options: [["lt6m","Moins de 6 mois"],["6m_2y","6 mois à 2 ans"],["2_5y","2 à 5 ans"],["gt5y","Plus de 5 ans"],["unknown","Je ne sais pas"]],
    next: "sensitivity"
  },

  {
    id: "sensitivity",
    section: "Dents",
    title: "Y a-t-il régulièrement une sensibilité dentaire ?",
    type: "single",
    options: [["no","Non"],["cold","Au froid"],["hot","Au chaud"],["both","Au froid et au chaud"],["sweet","Avec le sucre"],["unknown","Je ne sais pas"]],
    next: a => (a !== "no" && a !== "unknown") ? "sensitivity_duration" : "gum_bleeding"
  },
  {
    id: "sensitivity_duration",
    section: "Dents",
    title: "Lorsque le stimulus disparaît, la sensation…",
    type: "single",
    options: [["quick","Disparaît rapidement"],["while","Persiste un moment"],["minutes","Dure plusieurs minutes"],["unknown","Je ne sais pas"]],
    next: "gum_bleeding"
  },
  {
    id: "gum_bleeding",
    section: "Gencives",
    title: "Les gencives saignent-elles ?",
    type: "single",
    options: [["never","Jamais"],["rare","Rarement"],["sometimes","Parfois au brossage"],["often","Très souvent"],["spontaneous","Spontanément"],["unknown","Je ne sais pas"]],
    next: "gum_signs"
  },
  {
    id: "gum_signs",
    section: "Gencives",
    title: "À quoi ressemblent les gencives ?",
    help: "Les photos servent de repères et ne permettent pas de diagnostiquer une gingivite ou une parodontite.",
    type: "visual-multi", visualGroup: "gums",
    options: [
      ["normal","Aspect habituel"],["red","Rouges"],["swollen","Gonflées"],["painful","Douloureuses"],
      ["recession","Rétraction"],["longer","Dents paraissant plus longues"],["spaces","Espaces apparus ou agrandis"],
      ["mobile","Dent définitive mobile"],["pus","Écoulement ou pus"],["tartar","Tartre visible"],["none","Aucun"],["unknown","Je ne sais pas"]
    ],
    next: vals => Array.isArray(vals) && !vals.includes("none") && !vals.includes("unknown") && !vals.includes("normal") ? "gum_duration" : "halitosis"
  },
  {
    id: "gum_duration",
    section: "Gencives",
    title: "Depuis combien de temps ces changements sont-ils présents ?",
    type: "single",
    options: [["days","Quelques jours"],["weeks","Quelques semaines"],["months","Plusieurs mois"],["years","Plusieurs années"],["unknown","Je ne sais pas"]],
    next: "halitosis"
  },
  {
    id: "halitosis",
    section: "Haleine",
    title: "Y a-t-il régulièrement une mauvaise haleine ?",
    type: "single",
    options: [["no","Non"],["sometimes","Occasionnellement"],["often","Souvent"],["daily","Tous les jours"],["reported","Signalée par quelqu’un"],["unknown","Je ne sais pas"]],
    next: a => ["often","daily","reported"].includes(a) ? "halitosis_persist" : "dry_mouth"
  },
  {
    id: "halitosis_persist",
    section: "Haleine",
    title: "Persiste-t-elle malgré le brossage ?",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas"]],
    next: "dry_mouth"
  },
  {
    id: "dry_mouth",
    section: "Bouche sèche",
    title: "Y a-t-il régulièrement une sensation de bouche sèche ou un manque de salive ?",
    type: "single",
    options: [["never","Jamais"],["sometimes","Occasionnellement"],["often","Souvent"],["daily","Tous les jours"],["unknown","Je ne sais pas"]],
    next: "tongue_appearance"
  },
  {
    id: "tongue_appearance",
    section: "Langue",
    title: "À quoi ressemble la langue actuellement ?",
    help: "Les photos sont des repères et ne permettent pas de poser un diagnostic.",
    type: "visual-multi", visualGroup: "tongue",
    options: [
      ["normal","Aspect habituel"],["white_coating","Dépôt blanchâtre"],["yellow_coating","Dépôt jaunâtre"],
      ["red","Plus rouge que d’habitude"],["fissured","Sillons ou fissures"],["patches","Taches blanches ou rouges"],
      ["swollen","Gonflée"],["teethmarks","Marques des dents sur les bords"],["geographic","Zones rouges lisses à contours clairs"],
      ["black","Coloration foncée/noirâtre"],["ulcer","Plaie ou ulcération"],["pale","Très pâle"],["hairy","Aspect chevelu"],
      ["none","Aucun de ces signes"],["unknown","Je ne sais pas"]
    ],
    next: () => isMinor() ? "child_last_dentist" : "last_dentist"
  },

  // SUIVI ADULTE
  {
    id: "last_dentist",
    section: "Suivi",
    title: "Quand a eu lieu la dernière consultation chez un chirurgien-dentiste ?",
    type: "single",
    options: [["lt6","Moins de 6 mois"],["6_12","6 mois à 1 an"],["1_2y","1 à 2 ans"],["2_5y","2 à 5 ans"],["gt5y","Plus de 5 ans"],["never","Jamais"],["unknown","Je ne sais pas"]],
    next: "regular_followup"
  },
  {
    id: "regular_followup",
    section: "Suivi",
    title: "Y a-t-il des consultations régulières même sans douleur ?",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["problem_only","Seulement en cas de problème"],["unknown","Je ne sais pas"]],
    next: "last_scaling"
  },
  {
    id: "last_scaling",
    section: "Détartrage",
    title: "Quand a eu lieu le dernier détartrage ?",
    type: "single",
    options: [["lt6","Moins de 6 mois"],["6_12","6 mois à 1 an"],["1_2y","1 à 2 ans"],["gt2y","Plus de 2 ans"],["never","Jamais"],["unknown","Je ne sais pas"]],
    next: "scaling_recommended"
  },
  {
    id: "scaling_recommended",
    section: "Détartrage",
    title: "Un chirurgien-dentiste a-t-il recommandé une fréquence particulière de détartrage ou de maintenance parodontale ?",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas"]],
    next: a => a === "yes" ? "scaling_adherence" : "medical_risk"
  },
  {
    id: "scaling_adherence",
    section: "Détartrage",
    title: "Cette fréquence de suivi est-elle respectée ?",
    type: "single",
    options: [["yes","Oui"],["sometimes","Pas toujours"],["no","Non"]],
    next: "medical_risk"
  },
  {
    id: "medical_risk",
    section: "Santé générale",
    title: "L’une de ces situations concerne-t-elle la personne évaluée ?",
    type: "multi",
    options: [
      ["diabetes","Diabète"],["immuno","Maladie ou traitement diminuant les défenses immunitaires"],
      ["cancer","Traitement actuel ou récent contre un cancer"],["periodontitis","Antécédent de parodontite"],
      ["dry","Sécheresse buccale importante"],["med_dry","Médicament provoquant une sécheresse buccale"],
      ["difficulty","Difficulté physique ou cognitive rendant le brossage difficile"],["pregnancy","Grossesse"],
      ["none","Aucune"],["prefer_not","Je préfère ne pas répondre / je ne sais pas"]
    ],
    next: "tobacco"
  },
  {
    id: "tobacco",
    section: "Facteurs de risque",
    title: "Consommation actuelle de tabac ?",
    type: "single",
    options: [["no","Non"],["occasionally","Occasionnellement"],["daily","Quotidiennement"],["former","Arrêté"],["prefer_not","Je préfère ne pas répondre"]],
    next: "vape"
  },
  {
    id: "vape",
    section: "Facteurs de risque",
    title: "Utilisation actuelle d’une cigarette électronique ?",
    type: "single",
    options: [["no","Non"],["occasionally","Occasionnellement"],["regular","Régulièrement"],["prefer_not","Je préfère ne pas répondre"]],
    next: "brush_frequency"
  },

  // HYGIENE 12+
  {
    id: "brush_frequency",
    section: "Hygiène",
    title: () => isTeen() ? "À quelle fréquence l’adolescent se brosse-t-il les dents ?" : "À quelle fréquence les dents sont-elles brossées ?",
    type: "single",
    options: [["2plus","2 fois par jour ou plus"],["1","1 fois par jour"],["fewweek","Quelques fois par semaine"],["rare","Rarement"],["never","Jamais"]],
    next: "brush_duration"
  },
  {
    id: "brush_duration",
    section: "Hygiène",
    title: "Pendant combien de temps environ dure un brossage ?",
    type: "single",
    options: [["lt1","Moins d’1 minute"],["1_2","Entre 1 et 2 minutes"],["2plus","Environ 2 minutes ou plus"],["unknown","Je ne sais pas"]],
    next: "fluoride"
  },
  {
    id: "fluoride",
    section: "Hygiène",
    title: "Le dentifrice utilisé contient-il du fluor ?",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas"]],
    next: "interdental"
  },
  {
    id: "interdental",
    section: "Hygiène",
    title: "Les espaces entre les dents sont-ils nettoyés ?",
    type: "single",
    options: [["daily","Tous les jours"],["weekly","Plusieurs fois par semaine"],["occasionally","Occasionnellement"],["never","Jamais"],["dontknow","Je ne sais pas comment faire"]],
    next: a => a !== "never" && a !== "dontknow" ? "interdental_method" : "tongue"
  },
  {
    id: "interdental_method",
    section: "Hygiène",
    title: "Avec quoi ?",
    type: "multi",
    options: [["floss","Fil dentaire"],["brush","Brossettes interdentaires"],["water","Hydropulseur"],["other","Autre"],["unknown","Je ne sais pas"]],
    next: "tongue"
  },
  {
    id: "tongue",
    section: "Hygiène",
    title: "La langue est-elle nettoyée ?",
    type: "single",
    options: [["daily","Tous les jours"],["sometimes","Occasionnellement"],["never","Jamais"]],
    next: "sugar"
  },
  {
    id: "sugar",
    section: "Alimentation",
    title: "En dehors des repas, à quelle fréquence y a-t-il consommation d’aliments ou boissons sucrés ?",
    type: "single",
    options: [["rare","Rarement ou jamais"],["1day","Environ 1 fois par jour"],["2_3","2 à 3 fois par jour"],["gt3","Plus de 3 fois par jour"],["unknown","Je ne sais pas"]],
    next: "acid"
  },
  {
    id: "acid",
    section: "Alimentation",
    title: "À quelle fréquence des boissons acides sont-elles consommées ?",
    help: "Sodas, boissons énergisantes, jus et autres boissons acides.",
    type: "single",
    options: [["rare","Rarement ou jamais"],["weekly","Quelques fois par semaine"],["daily","Tous les jours"],["multi","Plusieurs fois par jour"]],
    next: () => isMinor() ? "plaque_test" : "chewing"
  },
  {
    id: "chewing",
    section: "Fonction",
    title: "Y a-t-il des difficultés à mâcher certains aliments en raison des dents ?",
    type: "single",
    options: [["no","Non"],["mild","Légèrement"],["regular","Régulièrement"],["limits","Cela limite l’alimentation"]],
    next: "devices"
  },
  {
    id: "devices",
    section: "Appareils et prothèses",
    title: "L’un de ces dispositifs est-il porté actuellement ?",
    type: "multi",
    options: [["ortho","Appareil orthodontique"],["denture","Prothèse amovible"],["implants","Implants dentaires"],["none","Aucun"]],
    next: "plaque_test"
  },

  // PLAQUE FACULTATIVE
  {
    id: "plaque_test",
    section: "Indice de plaque",
    title: "Un test avec révélateur de plaque a-t-il été réalisé récemment ?",
    type: "single",
    options: [["yes","Oui"],["no","Non"],["unknown","Je ne sais pas ce que c’est"]],
    next: a => a === "yes" ? "plaque_known" : "oral_lesion"
  },
  {
    id: "plaque_known",
    section: "Indice de plaque",
    title: "Le pourcentage de plaque est-il déjà connu ?",
    type: "single",
    options: [["yes","Oui"],["no","Non, le calculer"]],
    next: a => a === "yes" ? "plaque_percent" : "plaque_surfaces"
  },
  {
    id: "plaque_percent",
    section: "Indice de plaque",
    title: "Quel est l’indice de plaque ?",
    type: "number", min: 0, max: 100,
    next: "oral_lesion"
  },
  {
    id: "plaque_surfaces",
    section: "Indice de plaque",
    title: "Combien de surfaces présentent de la plaque ?",
    type: "number", min: 0, max: 500,
    next: "plaque_total"
  },
  {
    id: "plaque_total",
    section: "Indice de plaque",
    title: "Combien de surfaces ont été examinées au total ?",
    type: "number", min: 1, max: 500,
    next: "oral_lesion"
  },

  // MUQUEUSES COMMUNES
  {
    id: "oral_lesion",
    section: "Muqueuses",
    title: () => titleFor(
      "Avez-vous actuellement une plaie, un ulcère, une boule ou une zone rouge ou blanche dans la bouche qui ne disparaît pas ?",
      "Avez-vous remarqué chez votre enfant une plaie, un ulcère, une boule ou une zone rouge ou blanche dans la bouche ?",
      "Avez-vous remarqué une plaie, un ulcère, une boule ou une zone rouge ou blanche dans la bouche de la personne évaluée ?"
    ),
    type: "single",
    options: [["no","Non"],["lt2w","Oui, depuis moins de 2 semaines"],["gte2w","Oui, depuis 2 semaines ou plus"],["unknown","Je ne sais pas"]],
    next: a => ["lt2w","gte2w"].includes(a) ? "oral_lesion_details" : (isUnder12() ? null : "neck_lump")
  },
  {
    id: "oral_lesion_details",
    section: "Muqueuses",
    title: "Avez-vous remarqué l’un de ces signes au niveau de cette lésion ?",
    type: "multi",
    options: [["bleeds","Elle saigne sans raison évidente"],["growing","Elle grossit ou change d’aspect"],["painful","Elle est douloureuse"],["none","Aucun"],["unknown","Je ne sais pas"]],
    next: () => isUnder12() ? null : "neck_lump"
  },
  {
    id: "neck_lump",
    section: "Muqueuses",
    title: "Une boule persistante a-t-elle été remarquée au niveau du cou ?",
    type: "single",
    options: [["no","Non"],["yes","Oui"],["unknown","Je ne sais pas"]],
    next: null
  }
];

const byId = id => q.find(x => x.id === id);

const welcome = document.getElementById("welcome-screen");
const quiz = document.getElementById("quiz-screen");
const result = document.getElementById("result-screen");
const form = document.getElementById("answers-form");
const title = document.getElementById("question-title");
const help = document.getElementById("question-help");
const sectionLabel = document.getElementById("section-label");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");

document.getElementById("start-btn").addEventListener("click", () => {
  welcome.classList.add("hidden");
  quiz.classList.remove("hidden");
  renderQuestion();
});

document.getElementById("restart-btn").addEventListener("click", () => {
  state.answers = {};
  state.history = [];
  state.currentId = "consent";
  state.submitted = false;
  result.classList.add("hidden");
  welcome.classList.remove("hidden");
});

document.getElementById("print-btn").addEventListener("click", () => window.print());

backBtn.addEventListener("click", () => {
  if (!state.history.length) return;
  state.currentId = state.history.pop();
  renderQuestion();
});

nextBtn.addEventListener("click", () => {
  const question = byId(state.currentId);
  const answer = readAnswer(question);
  if (!isValid(question, answer)) {
    alert("Merci de sélectionner ou renseigner une réponse avant de continuer.");
    return;
  }

  state.answers[question.id] = answer;
  const next = typeof question.next === "function" ? question.next(answer) : question.next;

  if (next) {
    state.history.push(question.id);
    state.currentId = next;
    renderQuestion();
  } else {
    showResult();
  }
});

function visiblePathEstimate() {
  // Approximation simple pour la barre de progression.
  return isUnder12() ? 28 : (isTeen() ? 34 : 40);
}

function renderQuestion() {
  const question = byId(state.currentId);
  title.textContent = typeof question.title === "function" ? question.title() : question.title;
  const resolvedHelp = typeof question.help === "function" ? question.help() : (question.help || "");
  help.textContent = resolvedHelp;
  sectionLabel.textContent = question.section;
  form.innerHTML = "";
  if (question.type === "visual-multi") {
    help.textContent += " Vous pouvez sélectionner plusieurs réponses.";
  }
  form.className = "answers";
  backBtn.disabled = state.history.length === 0;

  const estimate = visiblePathEstimate();
  const current = Math.min(state.history.length + 1, estimate);
  progressText.textContent = `${current} / ~${estimate}`;
  progressFill.style.width = `${Math.min(100, (current / estimate) * 100)}%`;

  const previous = state.answers[question.id];

  if (question.type === "single" || question.type === "multi" || question.type === "visual-multi" || question.type === "visual-single") {
    if (question.type === "visual-multi" || question.type === "visual-single") {
      form.classList.add("visual-answers");
    } else {
      form.classList.remove("visual-answers");
    }
    const resolvedOptions = typeof question.options === "function" ? question.options() : question.options;
    resolvedOptions.forEach(([value, labelText]) => {
      const label = document.createElement("label");
      label.className = (question.type === "visual-multi" || question.type === "visual-single") ? "answer-card visual-card" : "answer-card";
      const input = document.createElement("input");
      input.type = (question.type === "single" || question.type === "visual-single") ? "radio" : "checkbox";
      input.name = question.id;
      input.value = value;

      const selected = (question.type === "single" || question.type === "visual-single")
        ? previous === value
        : Array.isArray(previous) && previous.includes(value);

      input.checked = selected;
      if (selected) label.classList.add("selected");

      input.addEventListener("change", () => {
        if (question.type === "single" || question.type === "visual-single") {
          document.querySelectorAll(".answer-card").forEach(x => x.classList.remove("selected"));
          label.classList.add("selected");
        } else {
          if (value === "none" && input.checked) {
            document.querySelectorAll(`input[name="${question.id}"]`).forEach(x => {
              if (x !== input) x.checked = false;
            });
            document.querySelectorAll(".answer-card").forEach(x => x.classList.remove("selected"));
            label.classList.add("selected");
          } else {
            const none = document.querySelector(`input[name="${question.id}"][value="none"]`);
            if (none) {
              none.checked = false;
              none.closest(".answer-card")?.classList.remove("selected");
            }
            label.classList.toggle("selected", input.checked);
          }
        }
      });

      if (question.type === "visual-multi" || question.type === "visual-single") {
        const visual = document.createElement("div");
        visual.className = `dental-visual ${question.visualGroup} ${value}`;
        visual.setAttribute("aria-hidden", "true");
        visual.innerHTML = buildDentalVisual(question.visualGroup, value);
        label.appendChild(visual);
      }
      const span = document.createElement("span");
      span.textContent = labelText;
      label.append(input, span);
      form.appendChild(label);
    });
  } else if (question.type === "range") {
    const wrap = document.createElement("div");
    wrap.className = "panel";
    const value = previous ?? 0;
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:18px;">
        <input id="range-input" style="width:100%" type="range" min="${question.min}" max="${question.max}" step="${question.step}" value="${value}">
        <strong id="range-value" style="font-size:28px;min-width:32px;text-align:center">${value}</strong>
      </div>`;
    form.appendChild(wrap);
    const slider = wrap.querySelector("#range-input");
    const out = wrap.querySelector("#range-value");
    slider.addEventListener("input", () => out.textContent = slider.value);
  } else if (question.type === "number") {
    const input = document.createElement("input");
    input.className = "input-field";
    input.type = "number";
    input.min = question.min;
    input.max = question.max;
    input.value = previous ?? "";
    input.placeholder = "Votre réponse";
    input.id = "number-input";
    form.appendChild(input);
  }
}


function buildDentalVisual(group, value) {
  const map = {
    gums: {
      normal: "assets/gums_normal.jpg",
      red: "assets/gums_red.jpg",
      swollen: "assets/gums_swollen.jpg",
      painful: "assets/gums_red.jpg",
      recession: "assets/gums_recession.jpg",
      longer: "assets/gums_recession.jpg",
      spaces: "assets/gums_spaces.jpg",
      mobile: "assets/gums_mobile.jpg",
      pus: "assets/gums_pus.jpg",
      tartar: "assets/gums_tartar.jpg"
    },
    teeth: {
      normal: "assets/teeth_normal_v2.jpg",
      cavity: "assets/teeth_cavity_v2.jpg",
      cracked: "assets/teeth_cracked_v2.jpg",
      piece_lost: "assets/teeth_cracked_v2.jpg",
      worn: "assets/teeth_worn_v2.jpg",
      yellow: "assets/teeth_yellow_v2.jpg",
      spaces: "assets/teeth_spaces_v2.jpg",
      misaligned: "assets/teeth_misaligned_v2.jpg",
      recession: "assets/teeth_recession_v2.jpg",
      longer: "assets/teeth_recession_v2.jpg",
      mobile: "assets/teeth_mobile_v2.jpg",
      restoration: "assets/teeth_restoration_v2.jpg",
      missing: "assets/teeth_missing_v2.jpg",
      implant: "assets/teeth_implant_v2.jpg",
      bridge: "assets/teeth_bridge_v2.jpg",
      denture: "assets/teeth_denture_v2.jpg",
      wisdom: "assets/teeth_normal_v2.jpg",
      food_trap: "assets/teeth_spaces_v2.jpg",
      none: "assets/teeth_normal_v2.jpg",
      spots: "assets/teeth_spots.jpg",
      unknown: "assets/teeth_normal_v2.jpg"
    },
    missing: {
      none: "assets/missing_none.jpg",
      one: "assets/missing_one.jpg",
      "2_4": "assets/missing_2_4.jpg",
      "5plus": "assets/missing_5plus.jpg",
      unknown: "assets/missing_none.jpg"
    },
    missing_reason: {
      caries: "assets/missing_caries.jpg",
      periodontal: "assets/missing_periodontal.jpg",
      trauma: "assets/missing_trauma.jpg",
      orthodontic: "assets/missing_ortho.jpg",
      surgery: "assets/missing_surgery.jpg",
      agenesis: "assets/missing_agenesis.jpg",
      unknown: "assets/missing_none.jpg",
      other: "assets/missing_none.jpg"
    },
    replacement: {
      implant: "assets/replacement_implant.jpg",
      bridge: "assets/replacement_bridge.jpg",
      denture: "assets/replacement_denture.jpg",
      partial: "assets/replacement_partial.jpg",
      no: "assets/replacement_none.jpg",
      unknown: "assets/replacement_none.jpg"
    },
    tongue: {
      normal: "assets/tongue_normal_v2.jpg",
      white_coating: "assets/tongue_white_v2.jpg",
      yellow_coating: "assets/tongue_yellow_v2.jpg",
      red: "assets/tongue_red_v2.jpg",
      fissured: "assets/tongue_fissured_v2.jpg",
      patches: "assets/tongue_patches_v2.jpg",
      swollen: "assets/tongue_swollen_v2.jpg",
      teethmarks: "assets/tongue_teethmarks_v2.jpg",
      geographic: "assets/tongue_geographic_v2.jpg",
      black: "assets/tongue_black_v2.jpg",
      ulcer: "assets/tongue_ulcer_v2.jpg",
      pale: "assets/tongue_pale_v2.jpg",
      hairy: "assets/tongue_hairy_v2.jpg",
      none: "assets/tongue_normal_v2.jpg",
      unknown: "assets/tongue_normal_v2.jpg"
    }
  };

  const src = map[group]?.[value];
  if (!src) {
    return `<div class="visual-placeholder">Illustration</div>`;
  }

  return `<img class="realistic-clinical-img" src="${src}" alt="" loading="lazy">`;
}


function readAnswer(question) {
  if (question.type === "single" || question.type === "visual-single") {
    return document.querySelector(`input[name="${question.id}"]:checked`)?.value ?? null;
  }
  if (question.type === "multi" || question.type === "visual-multi") {
    return [...document.querySelectorAll(`input[name="${question.id}"]:checked`)].map(x => x.value);
  }
  if (question.type === "range") {
    return Number(document.getElementById("range-input").value);
  }
  if (question.type === "number") {
    const v = document.getElementById("number-input").value;
    return v === "" ? null : Number(v);
  }
}

function isValid(question, answer) {
  if (question.type === "multi" || question.type === "visual-multi") return Array.isArray(answer) && answer.length > 0;
  if (question.type === "number") {
    return typeof answer === "number" && !Number.isNaN(answer) && answer >= question.min && answer <= question.max;
  }
  return answer !== null && answer !== undefined && answer !== "";
}

function arr(id) {
  const v = state.answers[id];
  return Array.isArray(v) ? v : [];
}
function has(id, value) { return arr(id).includes(value); }

function computePlaque() {
  if (typeof state.answers.plaque_percent === "number") return state.answers.plaque_percent;
  const p = state.answers.plaque_surfaces;
  const t = state.answers.plaque_total;
  if (typeof p === "number" && typeof t === "number" && t > 0) return Math.round((p / t) * 100);
  return null;
}

function determineLevel() {
  const a = state.answers;
  const redFlags = arr("redflags");

  // Urgence médicale : combinaison volontairement prudente.
  if (
    redFlags.includes("breathing") ||
    redFlags.includes("swallowing") ||
    redFlags.includes("eye_swelling") ||
    redFlags.includes("bleeding") ||
    redFlags.includes("major_trauma") ||
    (redFlags.includes("face_swelling") && a.fever === "yes") ||
    (a.infection_swelling === "yes" && a.fever === "yes" && arr("infection_details").includes("growing"))
  ) {
    return {
      code: "emergency",
      icon: "🚨",
      label: "Urgence médicale",
      cls: "level-emergency",
      headline: "Une prise en charge médicale urgente est recommandée.",
      text: "Vos réponses comportent au moins un signe d’alerte. Ne vous fiez pas au reste du questionnaire pour retarder une prise en charge."
    };
  }

  // Consultation dentaire urgente.
  const severePain = (a.pain === "yes" && Number(a.pain_scale) >= 8) || (a.pain_child === "yes" && arr("pain_child_signs").includes("severe"));
  const painUncontrolled = a.pain_relief === "no";
  if (
    redFlags.includes("trismus") ||
    severePain ||
    painUncontrolled ||
    (a.fever === "yes" && (has("gum_signs","swollen") || has("gum_signs","pus"))) ||
    has("gum_signs","pus") ||
    arr("infection_details").includes("pus") ||
    (arr("child_trauma_details").includes("avulsed") && a.child_trauma_tooth_type === "permanent") ||
    arr("dental_trauma_details").includes("avulsed") ||
    (arr("dental_trauma_details").includes("displaced") && ["lt1h","1_24h"].includes(a.dental_trauma_time))
  ) {
    return {
      code: "red",
      icon: "🔴",
      label: "Consultation dentaire urgente",
      cls: "level-red",
      headline: "Une consultation dentaire urgente est recommandée.",
      text: "Certaines réponses justifient une évaluation dentaire rapide."
    };
  }

  // Consultation dans les prochains jours.
  const persistentPain = a.pain === "yes" && ["4_7d","1_4w","gt1m","recurrent"].includes(a.pain_duration);
  const concerningPain = arr("pain_features").some(x => ["night","eating","bite","lingering","spontaneous"].includes(x));
  const lingeringSensitivity = ["while","minutes"].includes(a.sensitivity_duration);
  const periodontalToothLoss = arr("missing_reason").includes("periodontal");
  const activePeriodontalSigns = ["often","spontaneous"].includes(a.gum_bleeding) ||
    arr("gum_signs").some(x => ["recession","longer","spaces","mobile","pus"].includes(x));
  if (
    persistentPain ||
    concerningPain ||
    lingeringSensitivity ||
    has("dental_problems","cracked") ||
    has("dental_problems","missing") ||
    has("dental_problems","piece_lost") ||
    has("dental_problems","mobile") ||
    has("dental_problems","restoration") ||
    a.oral_lesion === "gte2w" ||
    arr("child_trauma_details").includes("fractured") ||
    arr("dental_trauma_details").includes("fractured") ||
    arr("child_trauma_details").includes("bleeding") ||
    arr("dental_trauma_details").includes("bleeding") ||
    a.chewing === "limits" ||
    arr("oral_lesion_details").includes("growing") ||
    arr("oral_lesion_details").includes("bleeds") ||
    a.neck_lump === "yes" ||
    (arr("tongue_appearance").includes("ulcer") && a.oral_lesion === "gte2w") ||
    (periodontalToothLoss && activePeriodontalSigns)
  ) {
    return {
      code: "orange",
      icon: "🟠",
      label: "Consultation dans les prochains jours",
      cls: "level-orange",
      headline: "Un examen dentaire prochain est recommandé.",
      text: "Vos réponses ne suggèrent pas forcément une urgence médicale, mais certains éléments méritent d’être évalués sans attendre un contrôle de routine."
    };
  }

  // Consultation recommandée.
  const gumConcern = ["often","spontaneous"].includes(a.gum_bleeding) || ["often","spontaneous"].includes(a.child_gum_bleeding) ||
    arr("gum_signs").some(x => ["red","swollen","recession","longer","spaces","mobile"].includes(x)) || arr("child_gum_signs").some(x => ["red","swollen","pus"].includes(x));
  const followupConcern = ["2_5y","gt5y","never"].includes(a.last_dentist) || a.child_last_dentist === "never";
  const cavity = has("dental_problems","cavity") || has("child_dental_signs","cavity");
  const recessionVisual = has("dental_problems","recession");
  const dry = ["often","daily"].includes(a.dry_mouth);
  const halitosis = ["often","daily","reported"].includes(a.halitosis);
  const chewingConcern = ["mild","regular"].includes(a.chewing);
  const localSwelling = a.infection_swelling === "yes";
  const tongueConcern = arr("tongue_appearance").some(x => ["patches","swollen","ulcer","black"].includes(x)) || a.child_apnea === "yes";
  const missingToothConcern = ["2_4","5plus"].includes(a.missing_teeth) ||
    ["no","partial"].includes(a.missing_replacement);
  const childDevelopmentConcern = ageYears() >= 3 && ["thumb","pacifier","both"].includes(a.child_suction) && (["hours","frequent"].includes(a.child_suction_frequency) || arr("child_suction_changes").some(x => !["none","unknown"].includes(x)));
  const childFrenulumConcern = arr("child_frenulum_function").some(x => !["none","unknown"].includes(x));
  const childBreathingConcern = arr("child_breathing").some(x => ["mouth","open_sleep","snore","lips"].includes(x));
  if (gumConcern || followupConcern || cavity || recessionVisual || dry || halitosis || a.oral_lesion === "lt2w" || chewingConcern || localSwelling || tongueConcern || missingToothConcern || childDevelopmentConcern || childFrenulumConcern || childBreathingConcern) {
    return {
      code: "yellow",
      icon: "🟡",
      label: "Consultation recommandée",
      cls: "level-yellow",
      headline: "Un bilan chez le chirurgien-dentiste est recommandé.",
      text: "Aucun signe d’urgence n’a été identifié, mais certaines réponses méritent un contrôle professionnel."
    };
  }

  return {
    code: "green",
    icon: "🟢",
    label: "Suivi préventif",
    cls: "level-green",
    headline: "Aucun signe nécessitant une consultation rapide n’a été identifié.",
    text: "Poursuivez votre suivi préventif. Un questionnaire ne peut toutefois pas confirmer l’absence de maladie bucco-dentaire."
  };
}

function preventionAdvice() {
  const a = state.answers;
  const rows = [];
  const tips = [];

  if (isUnder12()) {
    const hasTeeth = a.child_teeth_present !== "no";
    if (hasTeeth) {
      if (a.child_brush_frequency === "2plus" && a.child_fluoride === "yes") {
        rows.push(["Brossage de l’enfant", "Plutôt favorable", "Deux brossages quotidiens et dentifrice fluoré déclarés"]);
      } else {
        rows.push(["Brossage de l’enfant", "À améliorer", "La routine déclarée peut être renforcée"]);
        if (a.child_brush_frequency !== "2plus") tips.push("Viser deux brossages quotidiens adaptés à l’âge de l’enfant.");
        if (a.child_fluoride !== "yes") tips.push("Vérifier avec le chirurgien-dentiste/pharmacien que le dentifrice fluoré est adapté à l’âge.");
      }
      if (isUnder6() && ["child","irregular"].includes(a.child_brush_who)) {
        rows.push(["Aide au brossage", "À renforcer", "À cet âge, l’aide active d’un adulte reste importante"]);
        tips.push("Un adulte devrait réaliser ou compléter le brossage du jeune enfant.");
      } else if (ageYears() >= 6 && ageYears() < 12 && ["child","none"].includes(a.child_brush_who)) {
        rows.push(["Supervision", "À renforcer", "Une vérification par un adulte peut encore être utile"]);
      } else {
        rows.push(["Aide / supervision", "Adaptée", "Une implication d’un adulte est déclarée"]);
      }
    } else {
      rows.push(["Dents", "Pas encore sorties", "Le questionnaire a été adapté à l’absence de dents déclarée"]);
    }

    if (["2_3","gt3"].includes(a.child_sugar)) {
      rows.push(["Prises sucrées", "Point d’attention", "Plusieurs expositions quotidiennes en dehors des repas"]);
      tips.push("Réduire surtout la fréquence des prises sucrées entre les repas.");
    } else if (a.child_sugar) {
      rows.push(["Prises sucrées", "À surveiller", "Fréquence déclarée : " + (a.child_sugar === "rare" ? "faible" : "environ une fois par jour")]);
    }

    if (["thumb","pacifier","both"].includes(a.child_suction)) {
      const persistent = ageYears() >= 3;
      rows.push(["Pouce / tétine", persistent ? "À surveiller" : "Information", persistent ? "Habitude encore présente à partir de 3 ans" : "Habitude de succion déclarée"]);
      if (persistent) tips.push("Parler de l’habitude de succion au chirurgien-dentiste, surtout si elle est fréquente ou si la position des dents change.");
    }

    if (a.child_bottle === "yes" && (arr("child_bottle_when").includes("sleep") || arr("child_bottle_when").includes("night")) &&
        arr("child_bottle_content").some(x => ["milk","juice","sweet","other"].includes(x))) {
      rows.push(["Biberon nocturne", "Point d’attention", "Biberon autre que de l’eau au coucher ou pendant la nuit"]);
      tips.push("Discuter des habitudes nocturnes et du risque carieux lors du suivi dentaire.");
    }

    if (ageYears() >= 3 && a.mt_dents === "unknown_program") {
      rows.push(["M’T dents", "À découvrir", "Le dispositif annuel n’est pas connu"]);
      tips.push("Se renseigner sur le rendez-vous annuel M’T dents.");
    } else if (ageYears() >= 3 && a.mt_dents === "no") {
      rows.push(["M’T dents", "À programmer", "Pas de rendez-vous M’T dents déclaré sur les 12 derniers mois"]);
    }

    if (ageYears() >= 6 && ageYears() < 12) {
      if (a.sealants === "unknown_program") rows.push(["Scellement des sillons", "Information", "Cette mesure préventive n’est pas connue"]);
      if (arr("mixed_dentition").some(x => !["none","unknown"].includes(x))) rows.push(["Denture mixte", "À montrer au dentiste", "Une situation particulière d’éruption a été signalée"]);
    }

    if (arr("child_frenulum_function").some(x => !["none","unknown"].includes(x))) {
      rows.push(["Freins / fonctions", "À évaluer", "Une difficulté fonctionnelle a été signalée"]);
      tips.push("Une gêne fonctionnelle liée à la langue ou à l’alimentation mérite une évaluation professionnelle plutôt qu’un diagnostic sur photo.");
    }

    if (arr("child_breathing").some(x => ["mouth","open_sleep","snore","lips"].includes(x))) {
      rows.push(["Respiration / sommeil", "À discuter", "Respiration buccale, ronflement ou difficulté de fermeture labiale signalés"]);
    }

  } else {
    if (a.brush_frequency === "2plus" && a.brush_duration === "2plus" && a.fluoride === "yes") {
      rows.push(["Brossage", "Bon", "Routine globalement favorable"]);
    } else {
      rows.push(["Brossage", "À améliorer", "Visez deux brossages quotidiens d’environ deux minutes avec dentifrice fluoré"]);
      if (a.brush_frequency !== "2plus") tips.push("Passer progressivement à deux brossages par jour.");
      if (a.brush_duration !== "2plus") tips.push("Essayer d’atteindre environ deux minutes par brossage.");
      if (a.fluoride !== "yes") tips.push("Vérifier que le dentifrice contient du fluor.");
    }

    if (a.interdental === "daily") rows.push(["Nettoyage interdentaire", "Bon", "Pratique quotidienne déclarée"]);
    else if (a.interdental) rows.push(["Nettoyage interdentaire", "À améliorer", "À intégrer plus régulièrement selon les conseils du chirurgien-dentiste"]);

    if (["2_3","gt3"].includes(a.sugar)) {
      rows.push(["Prises sucrées", "Point d’attention", "Plusieurs expositions quotidiennes entre les repas"]);
      tips.push("Réduire la fréquence des prises sucrées entre les repas.");
    } else if (a.sugar) rows.push(["Prises sucrées", "Plutôt favorable", "Fréquence déclarée modérée"]);

    if (isTeen() && a.teen_ortho && a.teen_ortho !== "no") {
      rows.push(["Orthodontie", "Conseils adaptés", "L’hygiène autour de l’appareil mérite une attention particulière"]);
    }

    if (["one","2_4","5plus"].includes(a.missing_teeth)) {
      rows.push(["Dents manquantes", a.missing_replacement === "no" ? "À discuter" : "Information", "Une ou plusieurs dents définitives absentes ont été déclarées"]);
    }

    if (["lt6","6_12"].includes(a.last_dentist) && a.regular_followup === "yes") rows.push(["Suivi dentaire", "Bon", "Suivi récent et régulier déclaré"]);
    else if (isAdult()) {
      rows.push(["Suivi dentaire", "À renforcer", "Un contrôle régulier reste important même sans douleur"]);
      tips.push("Programmer ou maintenir un suivi régulier chez le chirurgien-dentiste.");
    }
  }

  const plaque = computePlaque();
  if (a.plaque_test) {
    if (plaque === null) rows.push(["Indice de plaque", "Non évalué", "Module facultatif non renseigné"]);
    else rows.push(["Indice de plaque", `${plaque} %`, "À interpréter selon le protocole utilisé"]);
  }

  return { rows, tips: [...new Set(tips)] };
}

function reasonsForLevel(level) {
  const a = state.answers;
  const reasons = [];

  if (level.code === "emergency") {
    const flags = arr("redflags");
    if (flags.includes("breathing")) reasons.push("Difficulté à respirer signalée");
    if (flags.includes("swallowing")) reasons.push("Difficulté à avaler signalée");
    if (flags.includes("eye_swelling")) reasons.push("Atteinte importante autour de l’œil signalée");
    if (flags.includes("bleeding")) reasons.push("Saignement important incontrôlé signalé");
    if (flags.includes("major_trauma")) reasons.push("Traumatisme facial important signalé");
    if (flags.includes("face_swelling") && a.fever === "yes") reasons.push("Gonflement important associé à de la fièvre");
  }

  if (a.pain === "yes") {
    if (Number(a.pain_scale) >= 8) reasons.push(`Douleur très importante (${a.pain_scale}/10)`);
    if (a.pain_relief === "no") reasons.push("Douleur restant importante malgré les antalgiques");
    if (["4_7d","1_4w","gt1m","recurrent"].includes(a.pain_duration)) reasons.push("Douleur persistante ou récurrente");
    if (arr("pain_features").includes("night")) reasons.push("Douleur réveillant la nuit");
    if (arr("pain_features").includes("bite")) reasons.push("Douleur à la mastication");
  }

  if (has("gum_signs","pus")) reasons.push("Écoulement ou pus gingival signalé");
  if (arr("infection_details").includes("pus")) reasons.push("Pus ou écoulement au niveau d’un gonflement localisé");
  if (arr("infection_details").includes("growing")) reasons.push("Gonflement localisé en augmentation");
  if (arr("dental_trauma_details").includes("avulsed")) reasons.push("Dent définitive expulsée après un choc");
  if (arr("dental_trauma_details").includes("displaced")) reasons.push("Dent déplacée après un choc");
  if (arr("dental_trauma_details").includes("fractured")) reasons.push("Dent fracturée après un choc");
  if (a.oral_lesion === "gte2w") reasons.push("Lésion buccale persistante depuis au moins 2 semaines");
  if (arr("oral_lesion_details").includes("growing")) reasons.push("Lésion buccale qui grossit ou change d’aspect");
  if (arr("oral_lesion_details").includes("bleeds")) reasons.push("Lésion buccale qui saigne sans raison évidente");
  if (a.neck_lump === "yes") reasons.push("Boule persistante au niveau du cou");
  if (a.chewing === "limits") reasons.push("Difficulté de mastication limitant l’alimentation");
  if (arr("tongue_appearance").includes("ulcer")) reasons.push("Plaie ou ulcération visible sur la langue");
  if (arr("tongue_appearance").includes("swollen")) reasons.push("Langue paraissant gonflée");
  if (arr("tongue_appearance").includes("patches")) reasons.push("Taches blanches ou rouges inhabituelles sur la langue");
  if (arr("missing_reason").includes("periodontal") && (["often","spontaneous"].includes(a.gum_bleeding) || arr("gum_signs").some(x => ["recession","longer","spaces","mobile","pus"].includes(x)))) reasons.push("Perte dentaire attribuée au déchaussement associée à des signes gingivaux actuels");
  if (a.missing_replacement === "no") reasons.push("Une ou plusieurs dents définitives absentes ne sont pas remplacées");
  if (has("dental_problems","cavity")) reasons.push("Cavité ou lésion carieuse visible signalée");
  if (has("dental_problems","recession")) reasons.push("Racine visible ou récession gingivale observée");
  if (has("dental_problems","missing")) reasons.push("Une ou plusieurs dents définitives semblent absentes");
  if (["often","spontaneous"].includes(a.gum_bleeding)) reasons.push("Saignements gingivaux fréquents ou spontanés");
  if (["2_5y","gt5y","never"].includes(a.last_dentist)) reasons.push("Suivi dentaire ancien ou absent");


  if (a.pain_child === "yes" && arr("pain_child_signs").includes("night")) reasons.push("Douleur ou gêne semblant réveiller l’enfant la nuit");
  if (a.pain_child === "yes" && arr("pain_child_signs").includes("eating")) reasons.push("Douleur ou gêne pendant les repas");
  if (arr("child_trauma_details").includes("avulsed")) reasons.push(a.child_trauma_tooth_type === "permanent" ? "Dent définitive expulsée après un choc" : "Dent sortie après un choc");
  if (arr("child_trauma_details").includes("displaced")) reasons.push("Dent déplacée après un choc");
  if (has("child_dental_signs","cavity")) reasons.push("Trou ou zone sombre observée sur une dent de l’enfant");
  if (["often","spontaneous"].includes(a.child_gum_bleeding)) reasons.push("Saignements gingivaux fréquents chez l’enfant");
  if (ageYears() >= 3 && ["thumb","pacifier","both"].includes(a.child_suction) && ["hours","frequent"].includes(a.child_suction_frequency)) reasons.push("Habitude de succion persistante et fréquente après 3 ans");
  if (arr("child_suction_changes").some(x => !["none","unknown"].includes(x))) reasons.push("Modification de la position des dents ou de la fermeture signalée");
  if (arr("child_frenulum_function").some(x => !["none","unknown"].includes(x))) reasons.push("Difficulté fonctionnelle de langue ou d’alimentation signalée");
  if (a.child_apnea === "yes") reasons.push("Pauses respiratoires observées pendant le sommeil");
  return reasons;
}

function sanitizedAnswersForStudy() {
  // L’âge exact sert à adapter le parcours, mais n’est pas transmis à la base.
  const copy = { ...state.answers };
  delete copy.age_years;
  delete copy.age_months;
  delete copy.consent;
  delete copy.study_consent;
  return copy;
}

function plaqueForStudy() {
  const value = plaqueValue();
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

async function submitStudyResponse(level) {
  const status = document.getElementById("data-collection-status");
  if (!status) return;

  if (state.answers.study_consent !== "yes") {
    status.innerHTML = "<strong>Collecte facultative :</strong> vos réponses n’ont pas été enregistrées.";
    return;
  }
  if (state.submitted) return;

  status.innerHTML = "<strong>Collecte facultative :</strong> enregistrement de votre participation…";
  const payload = {
    app_version: APP_VERSION,
    seminar_code: SEMINAR_CODE,
    study_consent: true,
    consent_version: CONSENT_VERSION,
    respondent_type: respondentMode() === "self" ? "self" : (state.answers.relationship || respondentMode()),
    age_band: state.answers.age_group || null,
    gender: state.answers.gender || null,
    result_priority: level.code,
    plaque_index: plaqueForStudy(),
    answers: sanitizedAnswersForStudy()
  };

  let body;
  try {
    body = JSON.stringify(payload);
  } catch (error) {
    console.error("Impossible de préparer les données statistiques", error);
    status.innerHTML = `<strong>Le bilan reste valable :</strong> les réponses n’ont pas pu être préparées pour l’enregistrement (${error.message}).`;
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/questionnaire_responses_v2`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body,
      signal: controller.signal
    });

    const responseText = await response.text();
    clearTimeout(timeoutId);

    if (!response.ok) {
      const detail = responseText ? ` — ${responseText}` : "";
      throw new Error(`HTTP ${response.status}${detail}`);
    }

    state.submitted = true;
    status.innerHTML = `<strong>✓ Participation enregistrée :</strong> Supabase a accepté la réponse (HTTP ${response.status}).`;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Enregistrement statistique impossible", error);
    const detail = error && error.name === "AbortError"
      ? "délai d’attente dépassé (12 secondes)"
      : (error?.message || "erreur inconnue");
    status.innerHTML = `<strong>Le bilan reste valable :</strong> les réponses n’ont pas pu être enregistrées. <span style="word-break:break-word">${detail}</span>`;
  }
}

function showResult() {
  quiz.classList.add("hidden");
  result.classList.remove("hidden");

  const level = determineLevel();
  const prevention = preventionAdvice();
  const reasons = reasonsForLevel(level);
  const rowsHtml = prevention.rows.map(([name,status,desc]) => `
    <div class="score-line">
      <div>
        <strong>${name}</strong>
        <div style="color:var(--muted);font-size:13px;margin-top:3px">${desc}</div>
      </div>
      <span class="tag">${status}</span>
    </div>
  `).join("");

  const tipsHtml = prevention.tips.length
    ? `<ul>${prevention.tips.map(t => `<li>${t}</li>`).join("")}</ul>`
    : `<p>Continuez vos habitudes favorables et votre suivi régulier.</p>`;

  const reasonsHtml = reasons.length
    ? `<div class="panel"><h3>Pourquoi ce niveau ?</h3><ul>${reasons.map(r => `<li>${r}</li>`).join("")}</ul></div>`
    : `<div class="panel"><h3>Pourquoi ce niveau ?</h3><p>Aucun élément déclaré n’a fait monter le niveau de priorité.</p></div>`;

  const emergencyBlock = level.code === "emergency"
    ? `<div class="notice" style="background:#fff0f0;border-color:#f1b8b8;color:#711f1f">
         <strong>En France :</strong> en cas d’urgence médicale, appelez le 15 ou le 112.
       </div>`
    : "";

  document.getElementById("result-content").innerHTML = `
    <div class="profile-summary">
      <strong>Profil :</strong>
      ${respondentMode() === "self" ? "Auto-bilan" : respondentMode() === "child" ? "Bilan rempli par un parent / responsable" : "Bilan rempli par un aidant / accompagnant"}
      · ${state.answers.age_group === "under1" || state.answers.age_group === "1_2" ? `${state.answers.age_months} mois` : `${state.answers.age_years} ans`}
    </div>
    <span class="result-badge ${level.cls}">${level.icon} ${level.label}</span>
    <h2>${level.headline}</h2>
    <p class="result-intro">${level.text}</p>

    ${emergencyBlock}

    <div class="grid">
      ${reasonsHtml}
      <div class="panel">
        <h3>Votre plan personnalisé</h3>
        ${tipsHtml}
      </div>
    </div>

    <div class="panel">
      <h3>Profil prévention</h3>
      ${rowsHtml}
    </div>

    <div class="notice data-collection-notice" id="data-collection-status" style="margin-top:22px">
      <strong>Collecte facultative :</strong> vérification en cours…
    </div>

    <div class="notice" style="margin-top:22px">
      <strong>Ce résultat n’est pas un diagnostic.</strong>
      Il repose uniquement sur les réponses fournies. Une carie débutante, une maladie parodontale silencieuse
      ou une autre anomalie peut exister sans symptôme.
    </div>
  `;

  submitStudyResponse(level);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

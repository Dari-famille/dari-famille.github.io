// Situations réelles — le cœur du mode Adulte.
//
// Les catégories de data.js apprennent des mots ; ce fichier apprend à s'en
// sortir dans un moment précis. La différence tient surtout aux `note` : la
// plupart des maladresses d'un conjoint français ne viennent pas d'une faute
// de vocabulaire mais d'une convention qu'on ne lui a jamais expliquée.
//
// `check: true` signale une formulation à faire valider par un locuteur natif
// avant diffusion — variante régionale possible, ou nuance dont je ne suis pas
// certain. Le mode Relecture (voir relecture dans app.js) ne liste que celles-là.

const SITUATIONS = [
  {
    id: "arrivee",
    label: "Arriver chez les grands-parents",
    emoji: "🏡",
    audience: "adult",
    free: true, // situation vitrine : accessible sans achat
    intro:
      "Les dix premières minutes donnent le ton du séjour. Personne n'attend " +
      "que vous parliez bien — on attend que vous essayiez.",
    lines: [
      {
        fr: "Bonjour à vous (salutation respectueuse)",
        latin: "Salam 3alikoum",
        arabic: "السلام عليكم",
        note:
          "La salutation par défaut en entrant quelque part. On répond " +
          "« wa 3alikoum salam ». Convient à tout âge et à tout contexte.",
      },
      {
        fr: "Comment allez-vous ?",
        latin: "Kif dayer ? (à un homme) / Kif dayra ? (à une femme)",
        arabic: "كيف داير؟ / كيف دايرة؟",
        note:
          "L'accord se fait sur la personne à qui vous parlez, pas sur vous. " +
          "On entend aussi « kidayer », contracté — c'est le même mot.",
      },
      {
        fr: "Ça va, Dieu merci",
        latin: "Lhamdulillah",
        arabic: "الحمد لله",
        note:
          "La réponse attendue, même si la journée a été mauvaise. Répondre " +
          "seulement « ça va » sans « lhamdulillah » sonne sec.",
      },
      {
        fr: "Je suis heureux d'être ici",
        latin: "Ana ferhan bach ana hna",
        arabic: "أنا فرحان باش أنا هنا",
        check: true,
        note: "Femme : « ferhana ». Formulation à faire confirmer.",
      },
      {
        fr: "Votre maison est très belle",
        latin: "Dar dyalkoum zwina bezzaf",
        arabic: "الدار ديالكم زوينة بزاف",
        note: "Compliment sûr et toujours bien reçu en arrivant.",
      },
      {
        fr: "Que Dieu te préserve (merci chaleureux)",
        latin: "Allah ykhlik",
        arabic: "الله يخليك",
        note:
          "Bien plus chaleureux que « choukran » seul. S'emploie pour " +
          "remercier quelqu'un qui vous rend service ou vous accueille.",
      },
    ],
  },

  {
    id: "compliment-enfant",
    label: "Complimenter un enfant",
    emoji: "🧒",
    audience: "adult",
    free: true,
    intro:
      "La situation où un conjoint français se trompe le plus souvent, sans " +
      "jamais comprendre pourquoi l'ambiance se refroidit.",
    lines: [
      {
        fr: "Qu'il est beau ! (avec la formule protectrice)",
        latin: "Tbarkallah 3lih !",
        arabic: "تبارك الله عليه",
        note:
          "LA règle à retenir. Complimenter un enfant — sa beauté, sa santé, " +
          "son intelligence — sans ajouter « tbarkallah » est perçu comme " +
          "attirer le mauvais œil sur lui. Ce n'est pas une superstition " +
          "marginale : l'omission se remarque et met mal à l'aise. Pour une " +
          "fille : « tbarkallah 3liha ».",
      },
      {
        fr: "Que Dieu le garde",
        latin: "Allah yhefdo",
        arabic: "الله يحفظو",
        note: "Fille : « Allah yhefdha ». Se dit souvent juste après tbarkallah.",
      },
      {
        fr: "Il a beaucoup grandi",
        latin: "Kber bezzaf",
        arabic: "كبر بزاف",
        check: true,
        note: "Fille : « kebrat bezzaf ». À faire confirmer.",
      },
      {
        fr: "C'est le portrait de sa mère",
        latin: "Kayechbeh mmo",
        arabic: "كيشبه مو",
        check: true,
        note:
          "Formulation courante mais plusieurs variantes existent — à faire " +
          "valider.",
      },
    ],
  },

  {
    id: "a-table",
    label: "À table",
    emoji: "🍽️",
    audience: "adult",
    free: false,
    intro:
      "On vous resservira. Plusieurs fois. Savoir refuser sans vexer est plus " +
      "utile que tout le vocabulaire des aliments.",
    lines: [
      {
        fr: "Que Dieu te donne la santé (merci pour le repas)",
        latin: "Allah y3tik saha",
        arabic: "الله يعطيك الصحة",
        note:
          "À dire à la personne qui a cuisiné, souvent la belle-mère. C'est " +
          "le remerciement attendu — « choukran » seul paraît tiède ici.",
      },
      {
        fr: "C'est délicieux",
        latin: "Ldid bezzaf",
        arabic: "لذيذ بزاف",
        note: "Dites-le tôt et à voix haute. Le silence est lu comme une réserve.",
      },
      {
        fr: "Un peu seulement, s'il te plaît",
        latin: "Chwiya safi, 3afak",
        arabic: "شوية صافي، عافاك",
        note:
          "Refuser franchement passe mal ; demander « un peu » est la sortie " +
          "polie. Attendez-vous à être resservi malgré tout.",
      },
      {
        fr: "Je n'ai plus faim, merci",
        latin: "Chba3t, Allah y3tik saha",
        arabic: "شبعت، الله يعطيك الصحة",
        note:
          "« Chba3t » (je suis rassasié) est un compliment déguisé : il dit " +
          "qu'il y avait largement assez. C'est le bon refus.",
      },
      {
        fr: "Ça suffit, merci",
        latin: "Baraka 3liya, choukran",
        arabic: "بركا عليا، شكرا",
        check: true,
        note: "Formulation à faire confirmer.",
      },
    ],
  },

  {
    id: "enfant-besoins",
    label: "Mon enfant a besoin de quelque chose",
    emoji: "🆘",
    audience: "both",
    free: true,
    intro:
      "Les phrases à connaître le jour où votre enfant est seul avec ses " +
      "grands-parents et que vous n'êtes pas dans la pièce.",
    lines: [
      {
        fr: "J'ai faim",
        latin: "Fiya jou3",
        arabic: "فيا الجوع",
        kid: true,
        check: true,
        note: "On entend aussi « jou3an » (garçon) / « jou3ana » (fille).",
      },
      {
        fr: "J'ai soif",
        latin: "Fiya l3tach",
        arabic: "فيا العطش",
        kid: true,
        check: true,
        note: "Variante : « 3tchan » / « 3tchana ».",
      },
      {
        fr: "Je veux de l'eau",
        latin: "Bghit lma",
        arabic: "بغيت الما",
        kid: true,
        note: "La phrase la plus utile de toute l'app pour un enfant de 5 ans.",
      },
      {
        fr: "J'ai mal ici",
        latin: "Kaydrni hna",
        arabic: "كيضرني هنا",
        kid: true,
        note:
          "En montrant l'endroit du doigt. Suffit à se faire comprendre de " +
          "n'importe qui.",
      },
      {
        fr: "Je veux aller aux toilettes",
        latin: "Bghit nmchi l toilette",
        arabic: "بغيت نمشي للتواليت",
        kid: true,
        note: "« Toilette » se dit tel quel, l'emprunt au français est courant.",
      },
      {
        fr: "Où est maman ?",
        latin: "Fin mama ?",
        arabic: "فين ماما؟",
        kid: true,
      },
      {
        fr: "Je veux dormir",
        latin: "Bghit n3es",
        arabic: "بغيت نعس",
        kid: true,
      },
    ],
  },

  {
    id: "jouer-cousins",
    label: "Jouer avec les cousins",
    emoji: "⚽",
    audience: "kid",
    free: true,
    intro: "De quoi entrer dans un jeu déjà commencé.",
    lines: [
      {
        fr: "Je peux jouer avec vous ?",
        latin: "Ymken nel3ab m3akoum ?",
        arabic: "يمكن نلعب معاكم؟",
        kid: true,
        check: true,
      },
      {
        fr: "À toi !",
        latin: "Dorek !",
        arabic: "دورك",
        kid: true,
        check: true,
        note: "Littéralement « ton tour ». À faire confirmer.",
      },
      {
        fr: "Attends-moi !",
        latin: "Tsenani !",
        arabic: "تسناني",
        kid: true,
      },
      {
        fr: "C'est mon tour",
        latin: "Dori ana",
        arabic: "دوري أنا",
        kid: true,
        check: true,
      },
      {
        fr: "On y va !",
        latin: "Yallah !",
        arabic: "يالله",
        kid: true,
        note: "Le mot à tout faire : « allez », « on y va », « viens ».",
      },
      {
        fr: "Bravo !",
        latin: "Bravo ! / Mzyan !",
        arabic: "مزيان",
        kid: true,
        note: "« Bravo » se dit aussi tel quel, emprunté au français.",
      },
    ],
  },

  {
    id: "prendre-conge",
    label: "Prendre congé",
    emoji: "👋",
    audience: "adult",
    free: false,
    intro:
      "Partir trop vite est impoli ; annoncer son départ à l'avance et " +
      "remercier longuement fait partie du rituel.",
    lines: [
      {
        fr: "Il faut qu'on y aille",
        latin: "Khassna nemchiw",
        arabic: "خاصنا نمشيو",
        check: true,
      },
      {
        fr: "Merci pour tout",
        latin: "Choukran 3la kolchi",
        arabic: "شكرا على كلشي",
      },
      {
        fr: "On s'est régalés",
        latin: "Frahna bezzaf",
        arabic: "فرحنا بزاف",
        check: true,
        note: "Littéralement « nous nous sommes réjouis ». À faire valider.",
      },
      {
        fr: "À bientôt, si Dieu le veut",
        latin: "Nchoufkoum qriban, inchallah",
        arabic: "نشوفكم قريبا، إن شاء الله",
        note:
          "« Inchallah » accompagne toute projection dans le futur. L'omettre " +
          "en annonçant un revoir sonne étrangement catégorique.",
      },
      {
        fr: "Que Dieu vous garde",
        latin: "Allah yhefdkoum",
        arabic: "الله يحفظكم",
        note: "Formule d'au revoir chaleureuse, adressée à toute la maisonnée.",
      },
    ],
  },
];

// Regroupe toutes les lignes marquées `check`, pour la relecture par un
// locuteur natif. Sans cette vue il faudrait relire les six situations en
// entier à chaque ajout.
function linesToCheck() {
  const out = [];
  SITUATIONS.forEach((sit) => {
    sit.lines.forEach((line) => {
      if (line.check) out.push({ situation: sit.label, ...line });
    });
  });
  return out;
}

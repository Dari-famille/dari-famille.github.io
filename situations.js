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
        note:
          "Femme : « ferhana ». Correction native reçue mais tronquée " +
          "(« Ana fer… ») — à redemander avant publication.",
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
        check: true,
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
        latin: "Kayechbeh mamah",
        arabic: "كيشبه ماماه",
        note: "Pour une fille : « katechbeh mamaha ».",
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
        note:
          "Plus ferme que « chwiya safi » : à garder pour le troisième " +
          "refus, quand on vous ressert malgré tout.",
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
        latin: "Noubtek !",
        arabic: "نوبتك",
        kid: true,
        note: "De « nouba », le tour de quelqu'un.",
      },
      {
        fr: "Attends-moi !",
        latin: "Tsenani !",
        arabic: "تسناني",
        kid: true,
      },
      {
        fr: "C'est mon tour",
        latin: "Noubti",
        arabic: "نوبتي",
        kid: true,
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
    id: "ce-quon-te-dit",
    label: "Ce que mamie va te dire",
    emoji: "👵",
    audience: "both",
    free: true,
    intro:
      "Toutes les autres pages apprennent à parler. Celle-ci apprend à " +
      "comprendre — et c'est l'inverse du vrai besoin d'un enfant. Personne " +
      "n'attend de lui qu'il fasse des phrases : on attend qu'il réagisse " +
      "quand on lui parle. Ce sont les mots qu'il va entendre vingt fois par " +
      "jour, adressés à lui.",
    lines: [
      {
        fr: "Viens !",
        latin: "Aji !",
        arabic: "أجي",
        kid: true,
        note:
          "Le mot numéro un. Une grand-mère qui appelle un enfant dit « aji », " +
          "pas autre chose. À reconnaître avant tous les autres.",
      },
      {
        fr: "Mange !",
        latin: "Kul !",
        arabic: "كول",
        kid: true,
      },
      {
        fr: "Bois !",
        latin: "Chreb !",
        arabic: "شرب",
        kid: true,
      },
      {
        fr: "Assieds-toi",
        latin: "Gles !",
        arabic: "كلس",
        kid: true,
      },
      {
        fr: "Lève-toi",
        latin: "Noud !",
        arabic: "نوض",
        kid: true,
      },
      {
        fr: "Regarde !",
        latin: "Chouf !",
        arabic: "شوف",
        kid: true,
      },
      {
        fr: "Écoute !",
        latin: "Sme3 !",
        arabic: "سمع",
        kid: true,
      },
      {
        fr: "Encore / continue",
        latin: "Zid !",
        arabic: "زيد",
        kid: true,
        note: "S'entend surtout à table, quand on veut vous resservir.",
      },
      {
        fr: "Ça suffit / arrête",
        latin: "Baraka !",
        arabic: "بركا",
        kid: true,
      },
      {
        fr: "Donne-moi",
        latin: "3tini",
        arabic: "عطيني",
        kid: true,
      },
      {
        fr: "Tu veux… ?",
        latin: "Bghiti… ?",
        arabic: "بغيتي؟",
        check: true,
        kid: true,
        note:
          "La question la plus fréquente adressée à un enfant. Savoir répondre " +
          "« iyeh » (oui) ou « la, choukran » (non merci) suffit à tenir " +
          "l'échange.",
      },
      {
        fr: "Tu as assez mangé ?",
        latin: "Chba3ti ?",
        arabic: "شبعتي؟",
        kid: true,
      },
      {
        fr: "Comment tu t'appelles ?",
        latin: "Chnou smitek ?",
        arabic: "شنو سميتك؟",
        kid: true,
      },
      {
        fr: "D'accord ?",
        latin: "Wakha ?",
        arabic: "وخا؟",
        kid: true,
        note: "Se répond par le même mot : « wakha ».",
      },
    ],
  },

  {
    id: "mots-partout",
    label: "Les mots qui reviennent sans cesse",
    emoji: "🔁",
    audience: "adult",
    free: true,
    intro:
      "Une dizaine de mots occupent une grosse part de tout ce qui se dit. " +
      "Aucun ne se traduit proprement, et aucune liste de vocabulaire ne les " +
      "enseigne — mais les connaître fait la différence entre suivre une " +
      "conversation et la regarder passer.",
    lines: [
      {
        fr: "D'accord / OK",
        latin: "Wakha",
        arabic: "وخا",
        note:
          "Le mot le plus utile du darija. Accord, acceptation, « bon, " +
          "d'accord » résigné : tout passe par lui.",
      },
      {
        fr: "C'est bon / ça suffit / terminé",
        latin: "Safi",
        arabic: "صافي",
        note:
          "Sert à clore n'importe quoi : une discussion, un repas, une " +
          "dispute d'enfants. « Safi ! » et on passe à autre chose.",
      },
      {
        fr: "Allez / on y va / viens",
        latin: "Yallah",
        arabic: "يالله",
        note: "Départ, encouragement, impatience — le contexte fait le sens.",
      },
      {
        fr: "Beaucoup / trop",
        latin: "Bezzaf",
        arabic: "بزاف",
        note: "Se place après le mot : « zwin bezzaf » = très beau.",
      },
      {
        fr: "Un peu",
        latin: "Chwiya",
        arabic: "شوية",
        note: "L'inverse de bezzaf, et l'arme absolue pour refuser poliment.",
      },
      {
        fr: "Maintenant",
        latin: "Daba",
        arabic: "دابا",
      },
      {
        fr: "Bien / bon",
        latin: "Mzyan",
        arabic: "مزيان",
        note: "Vaut aussi bien pour un plat que pour une personne ou une nouvelle.",
      },
      {
        fr: "Rien",
        latin: "Walou",
        arabic: "والو",
      },
      {
        fr: "Petit à petit",
        latin: "Chwiya b chwiya",
        arabic: "شوية بشوية",
        note:
          "Ce qu'on vous répondra quand vous vous excuserez de mal parler. " +
          "C'est un encouragement, pas une critique.",
      },
      {
        fr: "Au nom de Dieu (avant de commencer)",
        latin: "Bismillah",
        arabic: "بسم الله",
        note:
          "Se dit avant de manger, de monter en voiture, de commencer quelque " +
          "chose. Le dire avant le premier bouchon se remarque, en bien.",
      },
      {
        fr: "Si Dieu le veut",
        latin: "Inchallah",
        arabic: "إن شاء الله",
        note:
          "Accompagne toute projection future. Attention : peut aussi vouloir " +
          "dire un « non » poli qu'on n'assume pas. Le ton fait la différence.",
      },
      {
        fr: "Dieu merci",
        latin: "Lhamdulillah",
        arabic: "الحمد لله",
        note:
          "Réponse par défaut à « comment ça va ? », et ponctuation de toute " +
          "bonne nouvelle.",
      },
    ],
  },

  {
    id: "je-comprends-pas",
    label: "Je ne comprends pas",
    emoji: "🤷",
    audience: "both",
    free: true,
    intro:
      "Les phrases les plus rentables de toute l'app. Elles ne servent pas à " +
      "parler darija — elles servent à tenir dans une conversation qu'on ne " +
      "suit pas, et à faire ralentir les autres sans les vexer.",
    lines: [
      {
        fr: "Je ne parle pas bien le darija",
        latin: "Ma kanhdarch mzyan darija",
        arabic: "ما كنهضرش مزيان دارجة",
        kid: true,
        check: true,
        note:
          "À dire d'entrée. Elle désamorce tout : les gens ralentissent " +
          "d'eux-mêmes et apprécient l'effort au lieu de juger le niveau.",
      },
      {
        fr: "Je suis en train d'apprendre",
        latin: "Kant3allem",
        arabic: "كنتعلم",
        kid: true,
        check: true,
        note: "Change complètement le regard : vous n'êtes plus un touriste.",
      },
      {
        fr: "Je n'ai pas compris",
        latin: "Ma fhemtch",
        arabic: "ما فهمتش",
        kid: true,
      },
      {
        fr: "Répète, s'il te plaît",
        latin: "3awed 3afak",
        arabic: "عاود عافاك",
        kid: true,
      },
      {
        fr: "Doucement, s'il te plaît",
        latin: "Bchwiya 3afak",
        arabic: "بشوية عافاك",
        kid: true,
        note: "Plus efficace que « répète » : le problème est le débit, pas le mot.",
      },
      {
        fr: "Comment on dit ça ?",
        latin: "Kifach kaygoulou hadchi ?",
        arabic: "كيفاش كيقولو هادشي؟",
        check: true,
        note:
          "La question qui fait basculer une conversation en leçon. Les gens " +
          "adorent qu'on leur demande.",
      },
      {
        fr: "Qu'est-ce que ça veut dire ?",
        latin: "Achno kat3ni ?",
        arabic: "أشنو كتعني؟",
        check: true,
      },
    ],
  },

  {
    id: "telephone",
    label: "Au téléphone avec les grands-parents",
    emoji: "📞",
    audience: "both",
    free: false,
    intro:
      "Entre deux séjours, c'est le seul lien qui reste. Un appel de trois " +
      "minutes où l'enfant dit quatre phrases vaut plus qu'une semaine de " +
      "vocabulaire.",
    lines: [
      {
        fr: "Allô, c'est moi",
        latin: "Allo, ana",
        arabic: "ألو، أنا",
        kid: true,
      },
      {
        fr: "Tu m'entends ?",
        latin: "Katsem3ni ?",
        arabic: "كتسمعني؟",
        kid: true,
        check: true,
        note: "À un homme : « katsem3ni », à une femme : « katsem3ini ».",
      },
      {
        fr: "Tu me manques",
        latin: "Twahachtek",
        arabic: "توحشتك",
        check: true,
        kid: true,
        note:
          "Le mot le plus important de cette page. « Twahachtek » est bien " +
          "plus chargé que « tu me manques » en français — c'est le mot des " +
          "gens qu'on ne voit qu'une fois par an. Un enfant qui le dit à sa " +
          "grand-mère au téléphone, c'est le moment que vous cherchez.",
      },
      {
        fr: "Comment vas-tu, mamie ?",
        latin: "Kif dayra, jeddati ?",
        arabic: "كيف دايرة، جدتي؟",
        kid: true,
      },
      {
        fr: "Je t'embrasse",
        latin: "Kanbousek",
        arabic: "كنبوسك",
        kid: true,
        check: true,
      },
      {
        fr: "On vient bientôt",
        latin: "Ghadi njiw qriban, inchallah",
        arabic: "غادي نجيو قريبا، إن شاء الله",
        check: true,
      },
      {
        fr: "Passe-moi mamie",
        latin: "3tini jeddati, 3afak",
        arabic: "عطيني جدتي، عافاك",
        kid: true,
        check: true,
      },
    ],
  },

  {
    id: "occasions",
    label: "Fêtes et grandes occasions",
    emoji: "🎉",
    audience: "adult",
    free: false,
    intro:
      "Les moments où le silence se remarque le plus. Chaque occasion a sa " +
      "formule, et il en existe une pour presque tout.",
    lines: [
      {
        fr: "Joyeuse fête (Aïd)",
        latin: "3id moubarak sa3id",
        arabic: "عيد مبارك سعيد",
        note: "La formule de l'Aïd, à dire à tout le monde, y compris aux voisins.",
      },
      {
        fr: "Félicitations",
        latin: "Mabrouk",
        arabic: "مبروك",
        note:
          "S'emploie très largement : mariage, naissance, réussite, achat " +
          "d'une voiture, nouvelle maison.",
      },
      {
        fr: "Que Dieu te bénisse (réponse à « mabrouk »)",
        latin: "Allah ybarek fik",
        arabic: "الله يبارك فيك",
        note:
          "La réponse attendue quand on vous félicite. Ne pas répondre laisse " +
          "un blanc gênant.",
      },
      {
        fr: "À ta santé (vêtement neuf, coupe de cheveux, sortie de bain)",
        latin: "Bsaha",
        arabic: "بالصحة",
        note:
          "Surprenant pour un Français : on félicite quelqu'un qui sort du " +
          "hammam, qui étrenne des habits ou qui vient de se faire couper les " +
          "cheveux. Ne pas le dire passe pour de l'indifférence. Réponse : " +
          "« Allah y3tik saha ».",
      },
      {
        fr: "Que Dieu ait son âme (condoléances)",
        latin: "Allah yrahmo",
        arabic: "الله يرحمو",
        note:
          "Pour une femme : « Allah yrahmha ». À dire simplement, sans " +
          "chercher à en faire plus — la sobriété est de mise.",
      },
      {
        fr: "Que Dieu vous donne la patience",
        latin: "Allah y3tikoum sber",
        arabic: "الله يعطيكم الصبر",
        note: "S'adresse à la famille endeuillée.",
      },
    ],
  },

  {
    id: "sante",
    label: "Chez le médecin ou à la pharmacie",
    emoji: "🩺",
    audience: "adult",
    free: false,
    intro:
      "À préparer avant d'en avoir besoin. Le jour où ça arrive, on n'a pas " +
      "le temps de chercher ses mots.",
    lines: [
      {
        fr: "Mon fils a de la fièvre",
        latin: "Weldi fih skhana",
        arabic: "ولدي فيه سخانة",
        note:
          "Pour une fille : « bnti fiha skhana ». On dit « fih » (il y a en " +
          "lui) plutôt que « 3endo » (il a), comme pour la faim et la soif.",
      },
      {
        fr: "Il a mal au ventre",
        latin: "Kadrou kerchou",
        arabic: "كضرو كرشو",
      },
      {
        fr: "Depuis hier",
        latin: "Men lbareh",
        arabic: "من البارح",
      },
      {
        fr: "Il est allergique",
        latin: "3endo hasasiya",
        arabic: "عندو حساسية",
        check: true,
      },
      {
        fr: "Où est la pharmacie ?",
        latin: "Fin l farmasyan ?",
        arabic: "فين الفارماسيان؟",
        note: "Le mot est emprunté au français, il est compris partout.",
      },
      {
        fr: "Il faut un médecin",
        latin: "Khassna tbib",
        arabic: "خاصنا طبيب",
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

// ---- Kit de survie ----
// Les dix phrases qui permettent de tenir une semaine entière. Elles existent
// déjà ailleurs : on les référence au lieu de les recopier, pour qu'une
// correction de la relectrice se propage partout au lieu de laisser traîner
// une vieille version dans ce raccourci.
const SURVIVAL_KIT = {
  id: "kit-survie",
  label: "Les 10 qui te sauvent la vie",
  emoji: "🛟",
  audience: "adult",
  free: true,
  intro:
    "Si vous n'apprenez que dix choses avant de partir, apprenez celles-ci. " +
    "Elles ne vous feront pas parler darija — elles vous feront tenir une " +
    "semaine sans jamais être bloqué ni passer pour indifférent.",
  refs: [
    ["arrivee", "Bonjour à vous (salutation respectueuse)"],
    ["arrivee", "Que Dieu te préserve (merci chaleureux)"],
    ["je-comprends-pas", "Je ne parle pas bien le darija"],
    ["je-comprends-pas", "Je n'ai pas compris"],
    ["je-comprends-pas", "Doucement, s'il te plaît"],
    ["mots-partout", "D'accord / OK"],
    ["mots-partout", "Un peu"],
    ["a-table", "Que Dieu te donne la santé (merci pour le repas)"],
    ["a-table", "Je n'ai plus faim, merci"],
    ["compliment-enfant", "Qu'il est beau ! (avec la formule protectrice)"],
  ],
};

// Résout les références en vraies lignes et place le kit en tête de liste.
// Une référence cassée (phrase renommée) est signalée en console plutôt que
// d'échouer en silence et de produire un kit incomplet.
(function buildSurvivalKit() {
  const lines = [];
  SURVIVAL_KIT.refs.forEach(([sitId, fr]) => {
    const sit = SITUATIONS.find((s) => s.id === sitId);
    const line = sit && sit.lines.find((l) => l.fr === fr);
    if (!line) {
      console.warn(`Kit de survie : référence introuvable — ${sitId} / ${fr}`);
      return;
    }
    // On garde un lien vers la scène d'origine : une phrase isolée de son
    // contexte perd la moitié de son intérêt.
    lines.push({ ...line, from: sit.label });
  });
  SURVIVAL_KIT.lines = lines;
  SITUATIONS.unshift(SURVIVAL_KIT);
})();

// Regroupe toutes les lignes marquées `check`, pour la relecture par un
// locuteur natif. Sans cette vue il faudrait relire les six situations en
// entier à chaque ajout.
function linesToCheck() {
  const out = [];
  SITUATIONS.forEach((sit) => {
    // Le kit de survie ne fait que pointer vers des phrases définies ailleurs :
    // l'inclure ferait relire deux fois les mêmes expressions.
    if (sit.id === SURVIVAL_KIT.id) return;
    sit.lines.forEach((line) => {
      if (line.check) out.push({ situation: sit.label, ...line });
    });
  });
  return out;
}

import type { SubjectId } from './subjects';

export type TopicKind = 'topic' | 'oral' | 'coursework';

export interface Topic {
  id: string;
  subject: SubjectId;
  level: 'HL' | 'OL';
  area: string;
  label: string; // "Area: specific topic"
  startIdeas: string[];
  enabled: boolean;
  /** e.g. "geo-elective:economic", "tech-option:pneumatics" */
  requiresSetting?: string;
  kind: TopicKind;
}

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// ---------------------------------------------------------------------------
// Study-idea templates. Every topic gets 3–5 concrete starters. Specific
// overrides (below) replace the template where a topic needs its own ideas.
// ---------------------------------------------------------------------------
type Style =
  | 'maths' | 'physics' | 'geoPhysical' | 'geoRegional' | 'geoSkills' | 'geoEssay'
  | 'dcg' | 'dcgCad' | 'tech' | 'techElectronics' | 'techProgramming'
  | 'engFunctional' | 'engComposition' | 'engComprehension' | 'othelloChar' | 'othelloTheme'
  | 'othelloPlot' | 'othelloTechnique' | 'comparative' | 'poetry' | 'unseen'
  | 'irComhra' | 'irSraith' | 'irPoemRead' | 'irProse' | 'irPoem' | 'irGrammar' | 'irCluas' | 'irScriobh' | 'irLeamh';

const T: Record<Style, (t: string) => string[]> = {
  maths: (t) => [
    `Do 3 past-paper questions on ${t} and correct them against the marking scheme`,
    `Make a one-page summary: key formulas, method steps and one fully worked example`,
    `Check what the Formulae & Tables booklet gives you for ${t} and what you must memorise`,
    `Redo a question you got wrong before, without looking at the solution`,
    `Explain the method out loud in 60 seconds, then write the steps from memory`,
  ],
  physics: (t) => [
    `Write the definitions, formulas and units for ${t} from memory, then check your notes`,
    `Do 3 exam-style calculation questions on ${t}`,
    `Draw and label the key diagram or graph for ${t}`,
    `Explain ${t} out loud as if teaching a Junior Cycle student`,
    `Link ${t} to one real-world application or piece of technology`,
  ],
  geoPhysical: (t) => [
    `Draw and fully label a diagram of ${t}`,
    `Write a 30-mark answer (15 SRPs) explaining ${t}`,
    `Learn one named Irish example and one international example, with facts and figures`,
    `Answer a past-paper question on ${t} in 20 minutes`,
    `Make 6 flashcards of the key processes and terms`,
  ],
  geoRegional: (t) => [
    `List 8–10 SRPs for ${t} with specific named examples and statistics`,
    `Write a 30-mark answer on ${t}, then check it against a marking scheme`,
    `Draw a sketch map showing the key features for ${t}`,
    `Compare this with the matching section of your other region`,
  ],
  geoSkills: (t) => [
    `Do a past-paper skills question on ${t} with the map or photo in front of you`,
    `Practise drawing a sketch map/graph to scale, with title, key and frame`,
    `Write the step-by-step method so you never lose easy marks`,
  ],
  geoEssay: (t) => [
    `Plan an 80-mark essay on ${t}: 4–5 aspects, each with 8 SRPs`,
    `Gather named examples, case studies and statistics for ${t}`,
    `Write one full aspect (about 8 SRPs) under timed conditions`,
    `Read a past-paper question on ${t} and highlight exactly what it asks`,
  ],
  dcg: (t) => [
    `Do one past-paper question on ${t} under timed conditions`,
    `Redraw a worked example from your notes, step by step`,
    `Write the construction steps for ${t} in your own words`,
    `Sketch it freehand first to understand the 3D picture, then draw it accurately`,
  ],
  dcgCad: (t) => [
    `Model a small object in SolidWorks focusing on ${t}`,
    `Write a feature-tree plan before you start modelling`,
    `Link it to your kettle assignment: what could you improve using ${t}?`,
  ],
  tech: (t) => [
    `Make a summary sheet on ${t} with key terms and an annotated sketch`,
    `Answer a short question and one long question on ${t} from a past paper`,
    `Link ${t} to your pill dispenser project: where does it show up?`,
    `Make 6 flashcards and test yourself`,
  ],
  techElectronics: (t) => [
    `Draw the circuit symbol(s) and a working circuit using ${t}`,
    `Do 3 calculations involving ${t}`,
    `Explain how ${t} is used (or could be used) in your pill dispenser`,
    `Answer a past-paper electronics question on ${t}`,
  ],
  techProgramming: (t) => [
    `Draw a flowchart for a simple task using ${t}`,
    `Write and test a short program that uses ${t}`,
    `Annotate a past-paper code question, explaining each line`,
  ],
  engFunctional: (t) => [
    `Write a ${t} in 25 minutes on a past-paper Question B`,
    `List the 5 features of a ${t} (layout, register, audience, purpose, sign-off)`,
    `Read a sample H1 ${t} and note 3 techniques to steal`,
  ],
  engComposition: (t) => [
    `Plan a ${t} from a past-paper title in 10 minutes`,
    `Write the opening 200 words of a ${t}, focusing on a strong hook`,
    `Write a full ${t} in 80 minutes under exam conditions`,
    `Read a sample answer and mark it using PCLM (Purpose, Coherence, Language, Mechanics)`,
  ],
  engComprehension: (t) => [
    `Answer a past-paper Question A on ${t} in 40 minutes`,
    `Practise the PQE structure (Point, Quote, Explain) for ${t}`,
    `Read an opinion article today and note 5 language techniques`,
  ],
  othelloChar: (t) => [
    `Write a 1-page essay plan on ${t}'s role in the tragedy`,
    `Pick 5 key quotes for ${t} and explain what each reveals`,
    `Trace how ${t} changes from Act 1 to Act 5`,
    `Map ${t}'s relationships with each other character`,
  ],
  othelloTheme: (t) => [
    `Write a 1-page essay plan on how Shakespeare explores ${t.toLowerCase()}`,
    `Find 5 quotes on ${t.toLowerCase()} across different acts`,
    `Pick the 3 key scenes for ${t.toLowerCase()} and summarise each in 3 lines`,
    `Link ${t.toLowerCase()} to two characters and one dramatic technique`,
  ],
  othelloPlot: (t) => [
    `Summarise ${t} in 8 bullet points from memory`,
    `Pick the 3 most important moments in ${t} and say why they matter`,
    `Learn 3 quotes from ${t}`,
  ],
  othelloTechnique: (t) => [
    `Find 4 examples of ${t.toLowerCase()} and explain the effect on the audience`,
    `Write a paragraph showing how ${t.toLowerCase()} builds the tragedy`,
    `Add 3 ${t.toLowerCase()} quotes to your quote bank`,
  ],
  comparative: (t) => [
    `Make a key-moments table for ${t}`,
    `Plan a 70-mark comparative answer on ${t} using linking phrases`,
    `Write one comparative paragraph on ${t} that links all three texts`,
    `Read a past-paper question on ${t} and plan an answer in 10 minutes`,
  ],
  poetry: (t) => [
    `Re-read ${t} and annotate imagery, tone and sound`,
    `Learn 4–6 quotes from ${t}`,
    `Write a paragraph on how ${t} fits the poet's main themes`,
    `Plan an essay answer that uses ${t} as a main poem`,
  ],
  unseen: (t) => [
    `Do an unseen poem from a past paper in 20 minutes, focusing on ${t.toLowerCase()}`,
    `Pick a random poem online and write 3 points about ${t.toLowerCase()}`,
    `Learn the key terms for ${t.toLowerCase()} and one example of each`,
  ],
  irComhra: (t) => [
    `Write 8–10 sentences in Irish about ${t} and learn them`,
    `Record yourself answering 3 questions on ${t} and listen back`,
    `Learn 5 useful phrases (nathanna) for ${t}`,
    `Ask a friend or family member to quiz you for 3 minutes`,
  ],
  irSraith: (t) => [
    `Write 2–3 sentences in the past tense (aimsir chaite) for each picture in ${t}`,
    `Prepare answers to the 3 questions the examiner might ask about ${t}`,
    `Say the whole story out loud in under 2 minutes`,
  ],
  irPoemRead: (t) => [
    `Read ${t} aloud 3 times, recording the last one`,
    `Mark tricky words and check pronunciation on teanglann.ie`,
    `Practise reading slowly and clearly with expression`,
  ],
  irProse: (t) => [
    `Write a 10-point summary of ${t} in simple Irish`,
    `Learn the main characters and one key line each`,
    `Answer a past-paper question on ${t}`,
    `Learn 5 phrases to describe themes (téama) and characters (carachtar)`,
  ],
  irPoem: (t) => [
    `Write the main theme (téama) and 3 images (íomhánna) of ${t}`,
    `Learn 3 key lines from ${t}`,
    `Answer a past-paper poetry question on ${t}`,
  ],
  irGrammar: (t) => [
    `Learn the rules for ${t} with 5 examples`,
    `Do 15 practice sentences on ${t}`,
    `Spot ${t} in a reading passage and highlight each example`,
  ],
  irCluas: (t) => [
    `Do a past-paper cluastuiscint section on ${t} (audio from examinations.ie)`,
    `Learn 10 question words and common vocabulary`,
    `Listen to 10 minutes of RTÉ Raidió na Gaeltachta or TG4 and note 5 words`,
  ],
  irScriobh: (t) => [
    `Write a ${t} on a past-paper title`,
    `Learn 8 opening and closing phrases for a ${t}`,
    `Correct your last ${t} for tenses, séimhiú and urú`,
  ],
  irLeamh: (t) => [
    `Do a past-paper léamhthuiscint (${t}) in 25 minutes`,
    `Make a list of 10 new words from the passage`,
    `Practise answering in your own words, not copying whole lines`,
  ],
};

const OVERRIDES: Record<string, string[]> = {
  'Othello: Characters – Iago': [
    "Write a 1-page essay plan: 'Iago is the most compelling villain in Shakespeare'",
    'Pick 5 key quotes and explain what each reveals',
    'Map how Iago manipulates each character differently',
    'Analyse one of his soliloquies line by line',
  ],
  'Othello: Characters – Othello': [
    "Write an essay plan: 'Othello is a noble hero brought down by his own flaws'",
    'Track his language: compare his speech in Act 1 with Act 4',
    'Pick 5 quotes that show his change',
    'List the moments where he could have avoided his downfall',
  ],
  'Complex numbers: De Moivre\'s theorem': [
    'Prove De Moivre\'s theorem by induction from memory',
    'Use it to find (1 + i)^10 and check your answer',
    'Find the cube roots of a complex number and plot them on an Argand diagram',
    'Use it to derive cos 3θ in terms of cos θ',
  ],
};

interface Group {
  subject: SubjectId;
  level: 'HL' | 'OL';
  style: Style;
  area: string;
  items: string[];
  requiresSetting?: string;
  kind?: TopicKind;
  /** Use item as the idea subject (default) or the full label */
  ideaSubject?: (item: string, area: string) => string;
}

const G = (subject: SubjectId, style: Style, area: string, items: string[], extra: Partial<Group> = {}): Group => ({
  subject,
  level: subject === 'irish' ? 'OL' : 'HL',
  style,
  area,
  items,
  ...extra,
});

// ---------------------------------------------------------------------------
// ENGLISH HL
// ---------------------------------------------------------------------------
const english: Group[] = [
  G('english', 'engComprehension', 'Comprehension', ['Question A – understanding & summarising', 'Question A – style and language analysis', 'Visual texts (images)', 'Opinion & persuasive writing techniques']),
  G('english', 'engFunctional', 'Functional writing', ['Speech', 'Article', 'Letter / email', 'Report', 'Review', 'Diary entry']),
  G('english', 'engComposition', 'Composition', ['Personal essay', 'Short story', 'Speech', 'Discursive essay', 'Feature article', 'Descriptive writing']),
  G('english', 'othelloPlot', 'Othello', ['Plot – Act 1', 'Plot – Act 2', 'Plot – Act 3', 'Plot – Act 4', 'Plot – Act 5']),
  G('english', 'othelloChar', 'Othello', ['Characters – Othello', 'Characters – Iago', 'Characters – Desdemona', 'Characters – Emilia', 'Characters – Cassio', 'Characters – Roderigo', 'Characters – Brabantio', 'Characters – Bianca'], { ideaSubject: (i) => i.replace('Characters – ', '') }),
  G('english', 'othelloTheme', 'Othello', ['Themes – Jealousy', 'Themes – Deception', 'Themes – Race', 'Themes – Love', 'Themes – Gender', 'Themes – Tragedy'], { ideaSubject: (i) => i.replace('Themes – ', '') }),
  G('english', 'othelloTechnique', 'Othello', ['Imagery – Animal imagery', 'Imagery – Light and dark', 'Imagery – Heaven and hell', 'Dramatic techniques – Soliloquies', 'Dramatic techniques – Dramatic irony', 'Dramatic techniques – The handkerchief as symbol', 'Dramatic techniques – Setting: Venice vs Cyprus'], { ideaSubject: (i) => i.split(' – ').pop()! }),
  G('english', 'comparative', 'Comparative – Theme', ['1984', 'Small Things Like These', 'The Shawshank Redemption', 'Comparing all three texts'], { ideaSubject: (i) => `Theme in ${i}` }),
  G('english', 'comparative', 'Comparative – General Vision & Viewpoint', ['1984', 'Small Things Like These', 'The Shawshank Redemption', 'Comparing all three texts'], { ideaSubject: (i) => `General Vision & Viewpoint in ${i}` }),
  G('english', 'comparative', 'Comparative – Cultural Context', ['1984', 'Small Things Like These', 'The Shawshank Redemption', 'Comparing all three texts'], { ideaSubject: (i) => `Cultural Context in ${i}` }),
  G('english', 'comparative', 'Comparative', ['Key moments across the three texts', 'Linking phrases & answer structure'], { ideaSubject: (i) => i.toLowerCase() }),
  G('english', 'unseen', 'Unseen poetry', ['Approach and timing', 'Imagery and sound', 'Tone, mood and theme']),
  G('english', 'poetry', 'Poetry – Bishop', ['Overview, themes & style'], { ideaSubject: () => "Bishop's poetry" }),
  G('english', 'poetry', 'Poetry – Dickinson', ['Overview, themes & style'], { ideaSubject: () => "Dickinson's poetry" }),
  G('english', 'poetry', 'Poetry – Donne', ['Overview, themes & style'], { ideaSubject: () => "Donne's poetry" }),
  G('english', 'poetry', 'Poetry – Rich', ['Overview, themes & style'], { ideaSubject: () => "Rich's poetry" }),
  G('english', 'poetry', 'Poetry – Yeats', ['Overview, themes & style'], { ideaSubject: () => "Yeats's poetry" }),
  G('english', 'poetry', 'Poetry', ['Structuring a prescribed poetry essay'], { ideaSubject: () => 'your prescribed poets' }),
];

// ---------------------------------------------------------------------------
// MATHS HL
// ---------------------------------------------------------------------------
const maths: Group[] = [
  G('maths', 'maths', 'Number systems', ['N, Z, Q and R']),
  G('maths', 'maths', 'Indices', ['Laws of indices', 'Exponential equations']),
  G('maths', 'maths', 'Surds', ['Simplifying and rationalising', 'Surd equations']),
  G('maths', 'maths', 'Logs', ['Laws of logs', 'Log and exponential equations']),
  G('maths', 'maths', 'Complex numbers', ['Argand diagram and operations', 'Conjugates and division', 'Polar form', "De Moivre's theorem", "Roots using De Moivre's theorem"]),
  G('maths', 'maths', 'Sequences & series', ['Arithmetic sequences', 'Arithmetic series', 'Geometric sequences & series', 'Infinite geometric series & recurring decimals', 'Limits of sequences']),
  G('maths', 'maths', 'Financial maths', ['Compound interest, AER & APR', 'Depreciation', 'Present value', 'Loans, mortgages & amortisation', 'Annuities & pensions']),
  G('maths', 'maths', 'Proof', ['Induction – series', 'Induction – divisibility & inequalities', 'Contradiction']),
  G('maths', 'maths', 'Algebra', ['Expressions & factorising', 'Algebraic fractions', 'Changing the subject of a formula']),
  G('maths', 'maths', 'Equations', ['Quadratic equations', 'Simultaneous equations – three variables', 'Simultaneous equations – linear and non-linear', 'Cubic equations & the factor theorem']),
  G('maths', 'maths', 'Inequalities', ['Linear & quadratic inequalities', 'Rational & modulus inequalities']),
  G('maths', 'maths', 'Roots of equations', ['Sum & product of roots', 'Forming equations from roots']),
  G('maths', 'maths', 'Functions', ['Notation, domain & range', 'Composite functions', 'Inverse functions', 'Injective, surjective & bijective', 'Exponential & log graphs', 'Graph transformations', 'Limits']),
  G('maths', 'maths', 'Differentiation', ['First principles', 'Product, quotient & chain rules', 'Trig, exponential & log functions', 'Max & min', 'Curve sketching & points of inflection', 'Optimisation', 'Rates of change']),
  G('maths', 'maths', 'Integration', ['Rules & antiderivatives', 'Trig & exponential functions', 'Definite integrals', 'Area under a curve', 'Area between curves', 'Average value of a function']),
  G('maths', 'maths', 'Probability', ['Counting & arrangements', 'Combinations (nCr)', 'Probability rules', 'Conditional probability', 'Bernoulli trials & binomial distribution', 'Expected value']),
  G('maths', 'maths', 'Statistics', ['Data types & sampling', 'Measures of centre', 'Measures of spread (SD & IQR)', 'Correlation & line of best fit', 'Normal distribution & z-scores', 'Empirical rule', 'Confidence intervals', 'Hypothesis testing & p-values']),
  G('maths', 'maths', 'The line', ['Slope, distance & midpoint', 'Equations of lines', 'Perpendicular distance', 'Angle between two lines', 'Dividing a line segment in a ratio', 'Area of a triangle']),
  G('maths', 'maths', 'The circle', ['Equation of a circle', 'Tangents', 'Line and circle intersection', 'Touching circles']),
  G('maths', 'maths', 'Geometry', ['Formal theorem proofs', 'Constructions', 'Enlargements', 'Deduction questions']),
  G('maths', 'maths', 'Trigonometry', ['Sine & cosine rules', 'Area of a triangle (½ab sin C)', 'Radians, arc length & sector area', 'Trig graphs', 'Trig identities', 'Compound & double angle formulae', 'Trig equations', '3D problems']),
  G('maths', 'maths', 'Measurement', ['Area & volume of 3D shapes', 'Compound shapes & recasting problems', 'The trapezoidal rule']),
];

// ---------------------------------------------------------------------------
// PHYSICS HL (new course)
// ---------------------------------------------------------------------------
const physics: Group[] = [
  G('physics', 'physics', 'Nature of science', ['Planning experiments', 'Measurement & uncertainty', 'Drawing & interpreting graphs', 'Science in society']),
  G('physics', 'physics', 'Motion', ['Speed, velocity & displacement', 'Acceleration & equations of motion', 'Motion graphs', 'Vectors & scalars']),
  G('physics', 'physics', 'Forces', ["Newton's first law", "Newton's second law", "Newton's third law", 'Momentum & conservation of momentum', 'Pressure', 'Density & flotation', "Hooke's law"]),
  G('physics', 'physics', 'Work & energy', ['Work', 'Kinetic & potential energy', 'Power & efficiency', 'Conservation of energy']),
  G('physics', 'physics', 'Gravitation', ["Newton's law of gravitation", 'Gravitational field strength & weight']),
  G('physics', 'physics', 'Circular motion', ['Angular velocity & centripetal force', 'Satellites & orbits']),
  G('physics', 'physics', 'Heat', ['Temperature & thermometers', 'Specific heat capacity', 'Latent heat', 'Heat transfer & U-values']),
  G('physics', 'physics', 'Waves', ['Wave properties & the wave equation', 'Reflection', "Refraction & Snell's law", 'Total internal reflection', 'Diffraction', 'Interference', 'Diffraction grating', 'Standing waves', 'Polarisation', 'The Doppler effect', 'The EM spectrum']),
  G('physics', 'physics', 'Sound', ['Sound waves & intensity', 'Resonance, strings & pipes']),
  G('physics', 'physics', 'Electricity', ["Charge & Coulomb's law", 'Electric fields', 'Potential difference', 'Current & circuits', "Ohm's law", 'Resistance & resistivity', 'Series & parallel circuits', 'Electrical power & kWh', 'Domestic electricity & safety', 'Semiconductors & diodes']),
  G('physics', 'physics', 'Magnetism', ['Magnetic fields', 'Force on a current-carrying conductor', 'Electric motors', 'Electromagnetic induction', 'AC & generators', 'Transformers']),
  G('physics', 'physics', 'Modern physics', ['The cathode ray tube', 'The photoelectric effect', 'X-rays', 'Atomic models', 'Line spectra & energy levels', 'Radioactivity – alpha, beta, gamma', 'Half-life', 'E = mc²', 'Fission & nuclear reactors', 'Fusion']),
  G('physics', 'physics', 'Particle physics', ['Fundamental particles', 'Quarks & leptons', 'Particle accelerators']),
  G('physics', 'physics', 'Energy & sustainability', ['Renewable energy', 'Climate & the greenhouse effect', 'Physics in medicine', 'Physics in technology']),
];

// ---------------------------------------------------------------------------
// IRISH OL
// ---------------------------------------------------------------------------
const IRISH_POEMS = ['Dínit an Bhróin', 'Iníon', 'Glaoch Abhaile', 'Deireadh na Feide', 'Úirchill an Chreagáin'];
const irish: Group[] = [
  G('irish', 'irComhra', 'Comhrá', ['Mé féin (yourself)', 'Mo theaghlach (family)', 'Mo cheantar (your area)', 'An scoil (school)', 'Caitheamh aimsire (hobbies)', 'Post páirtaimseartha (part-time job)', 'Pleananna don todhchaí (future plans)', 'Laethanta saoire (holidays)', 'An teicneolaíocht (technology)', 'An tsláinte (health)', 'Cúrsaí reatha (current affairs)'], { kind: 'oral', ideaSubject: (i) => i.replace(/ \(.+\)/, '') }),
  G('irish', 'irSraith', 'Sraith pictiúr', Array.from({ length: 10 }, (_, i) => `Sraith Pictiúr ${i + 1}`), { kind: 'oral' }),
  G('irish', 'irPoemRead', 'Léamh filíochta (oral)', IRISH_POEMS, { kind: 'oral' }),
  G('irish', 'irCluas', 'Cluastuiscint', ['Fógraí (announcements)', 'Comhráite (conversations)', 'Píosaí nuachta (news)'], { ideaSubject: (i) => i.replace(/ \(.+\)/, '') }),
  G('irish', 'irScriobh', 'Ceapadóireacht', ['Blag (blog)', 'Ríomhphost (email)', 'Litir (letter)', 'Scéal (story)', 'Comhrá (dialogue)'], { ideaSubject: (i) => i.replace(/ \(.+\)/, '') }),
  G('irish', 'irLeamh', 'Léamhthuiscint', ['Léamhthuiscint A', 'Léamhthuiscint B']),
  G('irish', 'irProse', 'Prós', ['Clann Lir', 'Cuairteoir', 'An tIriseoir']),
  G('irish', 'irPoem', 'Filíocht', IRISH_POEMS),
  G('irish', 'irGrammar', 'Gramadach', ['An aimsir chaite', 'An aimsir láithreach', 'An aimsir fháistineach', 'An modh coinníollach', 'An séimhiú', 'An t-urú', 'An tuiseal ginideach']),
];

// ---------------------------------------------------------------------------
// DCG HL
// ---------------------------------------------------------------------------
const dcg: Group[] = [
  G('dcg', 'dcg', 'Projection systems', ['Orthographic projection', 'Auxiliary views', 'Isometric projection', 'Dimetric & trimetric axonometric', 'Oblique projection', 'Parallel perspective', 'Angular (2-point) perspective']),
  G('dcg', 'dcg', 'Shadows', ['Shadows in orthographic', 'Shadows in axonometric & perspective']),
  G('dcg', 'dcg', 'Conics', ['The ellipse', 'The parabola', 'The hyperbola', 'Tangents & conic properties']),
  G('dcg', 'dcg', 'Plane geometry', ['Geometric constructions', 'Loci of points & tangency']),
  G('dcg', 'dcg', 'Descriptive geometry', ['True length & true shape', 'Oblique planes', 'Lines and planes', 'Skew lines', 'Dihedral angles']),
  G('dcg', 'dcg', 'Intersections & developments', ['Intersection of solids', 'Developments & envelopments', 'Interpenetration of solids']),
  G('dcg', 'dcg', 'Communication', ['Freehand sketching – orthographic', 'Freehand sketching – pictorial', 'Drawing conventions, sections & dimensioning']),
  G('dcg', 'dcgCad', 'CAD (SolidWorks)', ['Part modelling', 'Assemblies & mates', 'Working drawings from models']),
  G('dcg', 'dcg', 'Dynamic mechanisms', ['Loci of mechanisms', 'Cams & cam profiles']),
  G('dcg', 'dcg', 'Structural forms', ['Hyperbolic paraboloids', 'Hyperboloids of revolution']),
  G('dcg', 'dcg', 'Geologic geometry', ['Strike & dip', 'Cuttings, embankments & ore veins']),
  G('dcg', 'dcg', 'Surface geometry', ['Developable & complex surfaces']),
  G('dcg', 'dcg', 'Assemblies', ['Assembly drawings & sectional views']),
];

// ---------------------------------------------------------------------------
// GEOGRAPHY HL
// ---------------------------------------------------------------------------
const geography: Group[] = [
  G('geography', 'geoPhysical', 'Plate tectonics', ['Theory & plate boundaries', 'Isostasy']),
  G('geography', 'geoPhysical', 'Volcanoes', ['Volcanic landforms & activity', 'Human interaction – volcanoes']),
  G('geography', 'geoPhysical', 'Earthquakes', ['Causes & measurement', 'Prediction & human impact']),
  G('geography', 'geoPhysical', 'Folding & faulting', ['Fold mountains', 'Faulting & rift valleys']),
  G('geography', 'geoPhysical', 'Rocks', ['Igneous rocks', 'Sedimentary rocks', 'Metamorphic rocks', 'Human interaction – rocks (quarrying, geothermal)']),
  G('geography', 'geoPhysical', 'Weathering & karst', ['Mechanical & chemical weathering', 'Karst landscape – The Burren']),
  G('geography', 'geoPhysical', 'Mass movement', ['Types of mass movement', 'Human interaction – mass movement']),
  G('geography', 'geoPhysical', 'Rivers', ['River processes', 'Erosional landforms', 'Depositional landforms', 'Human interaction – rivers (flooding, dams)']),
  G('geography', 'geoPhysical', 'Coasts', ['Coastal processes', 'Erosional landforms', 'Depositional landforms', 'Human interaction – coasts (defences)']),
  G('geography', 'geoPhysical', 'Glaciation', ['Erosional landforms', 'Depositional landforms', 'Human interaction – glaciation']),
  G('geography', 'geoRegional', 'Regions', ['The region concept & types of region', 'Cultural regions – language', 'Cultural regions – religion', 'Political regions', 'Urban growth & development']),
  G('geography', 'geoRegional', 'Irish core region', ['Primary activities', 'Secondary activities', 'Tertiary activities', 'Human processes']),
  G('geography', 'geoRegional', 'Irish peripheral region', ['Primary activities', 'Secondary activities', 'Tertiary activities', 'Human processes']),
  G('geography', 'geoRegional', 'European core region', ['Primary activities', 'Secondary activities', 'Tertiary activities', 'Human processes']),
  G('geography', 'geoRegional', 'European peripheral region', ['Primary activities', 'Secondary activities', 'Tertiary activities', 'Human processes']),
  G('geography', 'geoRegional', 'Continental region', ['Physical processes', 'Economic activities', 'Human processes']),
  G('geography', 'geoRegional', 'The EU', ['Expansion of the EU', 'Sovereignty & EU policies']),
  G('geography', 'geoSkills', 'Skills', ['OS maps – grid references & scale', 'OS maps – settlement & functions', 'Aerial photographs', 'Graphs & charts', 'Weather maps & satellite images', 'Statistical data']),
  // Electives
  G('geography', 'geoEssay', 'Economic elective', ['Levels of economic development', 'Globalisation', 'Multinational companies', 'The EU & economic activity', 'Economic activity & sustainability'], { requiresSetting: 'geo-elective:economic' }),
  G('geography', 'geoEssay', 'Human elective', ['Population growth & change', 'Population structure', 'Migration', 'Settlement patterns', 'Urban areas – growth & problems', 'Urban planning'], { requiresSetting: 'geo-elective:human' }),
  // HL options
  G('geography', 'geoEssay', 'Option: Economic development', ['Patterns of development', 'Factors in development', 'Aid & fair trade', 'Sustainable development'], { requiresSetting: 'geo-option:economic-dev' }),
  G('geography', 'geoEssay', 'Option: Culture & identity', ['Race & ethnicity', 'Language & identity', 'Religion & identity', 'Cultural conflict & nationalism'], { requiresSetting: 'geo-option:culture' }),
  G('geography', 'geoEssay', 'Option: Geoecology', ['Soil formation & characteristics', 'Soil types & classification', 'Biomes', 'Human interaction with biomes'], { requiresSetting: 'geo-option:geoecology' }),
  G('geography', 'geoEssay', 'Option: Atmosphere–ocean', ['Atmospheric circulation', 'Ocean currents', 'Air masses & fronts', 'Climate change'], { requiresSetting: 'geo-option:atmosphere' }),
];

// ---------------------------------------------------------------------------
// TECHNOLOGY HL
// ---------------------------------------------------------------------------
const technology: Group[] = [
  G('technology', 'tech', 'Design process', ['Stages of the design process', 'Design briefs & research', 'Evaluation & testing']),
  G('technology', 'tech', 'Design factors', ['Ergonomics & anthropometrics', 'Aesthetics & form', 'Sustainability & life cycle']),
  G('technology', 'tech', 'Graphics & CAD', ['Sketching & rendering', '2D/3D CAD modelling']),
  G('technology', 'tech', 'Materials', ['Woods', 'Metals', 'Plastics', 'Composites & smart materials']),
  G('technology', 'tech', 'Processes', ['Wasting processes', 'Forming processes', 'Joining methods', 'Finishes']),
  G('technology', 'tech', 'Health & safety', ['Workshop safety & risk assessment']),
  G('technology', 'techElectronics', 'Electronics', ['Resistors & resistor colour codes', 'Capacitors', 'Diodes & LEDs', 'Transistors as switches', 'Potential dividers', "Ohm's law calculations", 'Sensors (LDR, thermistor)']),
  G('technology', 'tech', 'Motors & mechanisms', ['DC motors', 'Gears & gear ratios', 'Levers & linkages']),
  G('technology', 'techProgramming', 'Microcontrollers & programming', ['Microcontroller inputs & outputs', 'Flowcharts', 'Loops & decisions in code']),
  G('technology', 'tech', 'ICT', ['ICT systems & data', 'Communication technologies']),
  G('technology', 'tech', 'Energy & power', ['Energy sources', 'Batteries & power supplies']),
  G('technology', 'tech', 'Technology & society', ['Impact of technology on society', 'Ethics & sustainability']),
  G('technology', 'tech', 'Project management', ['Planning & Gantt charts', 'Portfolio & documentation']),
  // Options
  G('technology', 'tech', 'Option: Mechanisms', ['Gear trains & velocity ratio', 'Pulleys & belts', 'Cams & followers', 'Linkages & mechanical advantage'], { requiresSetting: 'tech-option:mechanisms' }),
  G('technology', 'tech', 'Option: Pneumatics & control', ['Cylinders & valves', 'Pneumatic circuits', 'Control systems & feedback', 'Sequential control'], { requiresSetting: 'tech-option:pneumatics' }),
  G('technology', 'techElectronics', 'Option: Electronics', ['Op-amps', '555 timer', 'Logic gates', 'Transistor circuits'], { requiresSetting: 'tech-option:electronics' }),
  G('technology', 'tech', 'Option: ICT & networks', ['Network types & topologies', 'Protocols & the internet', 'Network security'], { requiresSetting: 'tech-option:ict' }),
  G('technology', 'techProgramming', 'Option: Programming', ['Algorithms', 'Variables & data types', 'Functions', 'Debugging & testing'], { requiresSetting: 'tech-option:programming' }),
  G('technology', 'tech', 'Option: CAD/CAM & manufacturing', ['CNC machining', '3D printing', 'Laser cutting', 'Manufacturing systems'], { requiresSetting: 'tech-option:cadcam' }),
  G('technology', 'tech', 'Option: Materials technology', ['Material properties', 'Material testing', 'Heat treatment', 'Material selection'], { requiresSetting: 'tech-option:materials' }),
];

function build(groups: Group[]): Topic[] {
  const out: Topic[] = [];
  for (const g of groups) {
    for (const item of g.items) {
      const label = `${g.area}: ${item}`;
      const ideaSubject = g.ideaSubject ? g.ideaSubject(item, g.area) : item;
      out.push({
        id: slug(`${g.subject}-${label}`),
        subject: g.subject,
        level: g.level,
        area: g.area,
        label,
        startIdeas: OVERRIDES[label] ?? T[g.style](ideaSubject),
        enabled: true,
        requiresSetting: g.requiresSetting,
        kind: g.kind ?? 'topic',
      });
    }
  }
  return out;
}

export const BASE_TOPICS: Topic[] = build([...english, ...maths, ...physics, ...irish, ...dcg, ...geography, ...technology]);

/** Topics generated from Settings (poems, Irish prose choices). */
export function settingsTopics(poems: Record<string, string[]>, irishProse: string[]): Topic[] {
  const groups: Group[] = [];
  for (const [poet, list] of Object.entries(poems)) {
    const clean = list.map((p) => p.trim()).filter(Boolean);
    if (clean.length) groups.push(G('english', 'poetry', `Poetry – ${poet}`, clean));
  }
  const prose = irishProse.map((p) => p.trim()).filter(Boolean);
  if (prose.length) groups.push(G('irish', 'irProse', 'Prós', prose));
  return build(groups);
}

export const POETS = ['Bishop', 'Dickinson', 'Donne', 'Rich', 'Yeats'];

export const TECH_OPTIONS: { id: string; name: string }[] = [
  { id: 'mechanisms', name: 'Mechanisms' },
  { id: 'pneumatics', name: 'Pneumatics & control' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'ict', name: 'ICT & networks' },
  { id: 'programming', name: 'Programming' },
  { id: 'cadcam', name: 'CAD/CAM & manufacturing' },
  { id: 'materials', name: 'Materials technology' },
];

export const GEO_OPTIONS: { id: string; name: string }[] = [
  { id: 'economic-dev', name: 'Patterns & processes in economic development' },
  { id: 'culture', name: 'Culture & identity' },
  { id: 'geoecology', name: 'Geoecology' },
  { id: 'atmosphere', name: 'Atmosphere–ocean environment' },
];

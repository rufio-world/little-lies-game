export const translations = {
  en: {
    // Main Menu
    mainMenu: {
      title: "Little Lies",
      subtitle: "The ultimate bluff and trivia game",
      newGame: "New Game",
      joinGame: "Join Game", 
      settings: "Settings",
      store: "Store",
      leaderboard: "Leaderboard",
      quit: "Quit"
    },
    
    // Settings
    settings: {
      title: "Settings",
      playerName: "Player Name",
      profileImage: "Profile Image",
      guestMode: "Guest Mode",
      language: "Language",
      back: "Back",
      save: "Save",
      uploadImage: "Upload Image",
      defaultAvatar: "Use Default Avatar"
    },

    // Create Game
    createGame: {
      title: "Create Game",
      gameName: "Game Name",
      gameCode: "Game Code",
      generate: "Generate Code",
      selectPacks: "Select Question Packs",
      language: "Select cards language",
      cardsLocalePrefix: "Cards locale:",
  usingPacksPrefix: "Using packs:",
      numberOfQuestions: "Number of Questions",
      createRoom: "Create Room",
      back: "Back"
    },

    // Join Game
    joinGame: {
      title: "Join Game",
      enterCode: "Enter Game Code",
      join: "Join",
      back: "Back",
      invalidCode: "Invalid game code",
      lengthError: "Game code must be {{length}} characters long",
      success: "Joined game! Get ready for the first question.",
      instructions: {
        askHost: "Ask the host for the game code",
        internet: "Make sure you're connected to the internet"
      },
      errors: {
        title: "Unable to join",
        notFound: "We couldn't find a game with that code. Please double-check it with the host.",
        alreadyStarted: "That game has already started. Please ask the host for a different code.",
        alreadyInGame: "You're still part of another game. Leave that game before joining a new one.",
        authRequired: "You need to sign in before joining a game.",
        generic: "Something went wrong while joining. Please try again."
      }
    },

    // Waiting Room
    waitingRoom: {
      title: "Waiting Room",
      gameCode: "Game Code",
      players: "Players",
      startGame: "Start Game",
      kickPlayer: "Kick",
      leaveGame: "Leave Game",
      waitingForPlayers: "Waiting for other players...",
      soloWarning: "You're about to start the game alone. Are you sure?"
    },

    // Game
    game: {
      round: "Round",
      question: "Question",
      submitAnswer: "Submit Fake Answer",
      yourAnswer: "Your Answer",
      selectAnswer: "Select Your Answer",
      vote: "Vote",
      cannotVoteOwn: "You cannot vote for your own answer",
      correctAnswer: "Correct Answer",
      results: "Results",
      scores: "Scores",
      nextRound: "Next Round",
      endGame: "End Game",
      winner: "Winner",
      playAgain: "Play Again",
      newPack: "Choose New Pack",
      mainMenu: "Main Menu",
      // Game phases
      timeToSubmit: "Time to Submit Answer",
      timeToVote: "Time to Vote",
      strategyTip: "Strategy Tip",
      strategyText: "Create an answer that sounds plausible but isn't too obvious. Think about what other players might expect the real answer to be!",
      typeFakeAnswer: "Type your fake answer here... Make it convincing!",
      submitYourAnswer: "Submit Your Answer",
      players: "Players",
      you: "You",
      writing: "Writing...",
      voting: "Voting...",
      waiting: "Waiting...",
      whichCorrect: "Which is the correct answer?",
      chooseAnswer: "Choose the answer you think is correct. You'll earn points for guessing right!",
      yourResults: "Your Results This Round",
      pointsEarned: "Points Earned:",
      correctVote: "Correct Vote! ✓",
      correctlyIdentified: "You correctly identified the real answer!",
      roundSummary: "Round Summary",
      noOneFooled: "No one was fooled by your answer this round, but you can still earn points by voting correctly!",
      allAnswersRevealed: "All Answers Revealed",
      votes: "votes",
      answer: "Answer",
      currentScoreboard: "Current Scoreboard",
      host: "Host",
      points: "points",
      playerReadiness: "Player Readiness",
      leaveGame: "Leave Game",
      leaveGameConfirm: "Are you sure you want to leave this game? Your progress for this match will be lost.",
      getReady: "Get ready to create a fake answer!",
      goalText: "Your goal is to create a convincing fake answer that will fool other players!",
      howToPlay: "How to play:",
      howToPlay1: "Write a fake answer that sounds believable",
      howToPlay2: "Try to trick other players into voting for your answer",
      howToPlay3: "You'll earn points for every player you fool",
      howToPlay4: "You also earn points if you guess the correct answer",
      startWriting: "Start Writing Your Answer",
      readingTime: "Reading Time",
      submitted: "Submitted",
      incorrectVote: "Incorrect Vote",
      youWereTricked: "You were tricked by",
      fakeAnswer: "'s fake answer",
      didNotVoteCorrect: "You didn't vote for the correct answer",
      youTricked: "You Tricked Players! 🎯",
      fooledPlayers: "fooled player",
      roundSummaryNote: "Round Summary",
      noOneFooledNote: "No one was fooled by your answer this round, but you can still earn points by voting correctly!",
      ready: "Ready",
      waitingOthers: "Waiting for the other players",
      readyNextRound: "I'm Ready for Next Round"
    },

    // Store
    store: {
      title: "Store",
      questionPacks: "Question Packs",
      free: "Free",
      premium: "Premium",
      preview: "Preview",
      buy: "Buy",
      download: "Download",
      owned: "Owned",
      back: "Back"
    },

    // Leaderboard
    leaderboard: {
      title: "Leaderboard",
      weekly: "Weekly",
      monthly: "Monthly",
      allTime: "All Time",
      rank: "Rank",
      player: "Player",
      score: "Score",
      guest: "Guest",
      back: "Back"
    },

    // Question Packs
    packs: {
      popCulture: "Pop Culture",
      travelPlaces: "Travel & Places", 
      impossible: "Impossible Questions",
      trollCorner: "Troll Corner",
      grandparents: "For Playing with Grandparents"
    },

    // Common
    common: {
      loading: "Loading...",
      error: "Error",
      retry: "Retry",
      confirm: "Confirm",
      cancel: "Cancel",
      yes: "Yes",
      no: "No",
      ok: "OK",
      of: "of"
    }
  },

  es: {
    // Main Menu
    mainMenu: {
      title: "Pequeñas Mentiras",
      subtitle: "Un juego de preguntas y engaños",
      newGame: "Nueva Partida",
      joinGame: "Unirse a Partida",
      settings: "Configuración",
      store: "Tienda",
      leaderboard: "Clasificación",
      quit: "Salir"
    },

    // Settings  
    settings: {
      title: "Configuración",
      playerName: "Nombre del Jugador",
      profileImage: "Imagen de Perfil",
      guestMode: "Modo Invitado",
      language: "Idioma",
      back: "Volver",
      save: "Guardar",
      uploadImage: "Subir Imagen",
      defaultAvatar: "Usar Avatar por Defecto"
    },

    // Create Game
    createGame: {
      title: "Crear Partida",
      gameName: "Nombre de la Partida",
      gameCode: "Código de Partida",
      generate: "Generar Código",
      selectPacks: "Seleccionar Paquetes de Preguntas",
      language: "Idioma de las cartas",
      cardsLocalePrefix: "Idioma de las cartas:",
  usingPacksPrefix: "Usando paquetes:",
      numberOfQuestions: "Número de Preguntas",
      createRoom: "Crear Sala",
      back: "Volver"
    },

    // Join Game
    joinGame: {
      title: "Unirse a Partida",
      enterCode: "Introducir Código de Partida",
      join: "Unirse",
      back: "Volver",
      invalidCode: "Código de partida inválido",
      lengthError: "El código debe tener {{length}} caracteres",
      success: "¡Te uniste a la partida! Prepárate para la primera pregunta.",
      instructions: {
        askHost: "Pídele el código al anfitrión",
        internet: "Asegúrate de estar conectado a internet"
      },
      errors: {
        title: "No se pudo unir",
        notFound: "No encontramos una partida con ese código. Verifícalo con el anfitrión.",
        alreadyStarted: "Esa partida ya comenzó. Pide al anfitrión un código diferente.",
        alreadyInGame: "Todavía formas parte de otra partida. Debes salir antes de unirte a una nueva.",
        authRequired: "Debes iniciar sesión antes de unirte a una partida.",
        generic: "Ocurrió un error al unirte. Inténtalo de nuevo."
      }
    },

    // Waiting Room
    waitingRoom: {
      title: "Sala de Espera",
      gameCode: "Código de Partida",
      players: "Jugadores",
      startGame: "Comenzar Partida",
      kickPlayer: "Expulsar",
      leaveGame: "Salir de la Partida",
      waitingForPlayers: "Esperando otros jugadores...",
      soloWarning: "Estás a punto de comenzar el juego solo. ¿Estás seguro?"
    },

    // Game
    game: {
      round: "Ronda",
      question: "Pregunta",
      submitAnswer: "Enviar Respuesta Falsa",
      yourAnswer: "Tu Respuesta",
      selectAnswer: "Selecciona tu Respuesta",
      vote: "Votar",
      cannotVoteOwn: "No puedes votar por tu propia respuesta",
      correctAnswer: "Respuesta Correcta",
      results: "Resultados",
      scores: "Puntuaciones",
      nextRound: "Siguiente Ronda",
      endGame: "Terminar Partida",
      winner: "Ganador",
      playAgain: "Jugar de Nuevo",
      newPack: "Elegir Nuevo Paquete",
      mainMenu: "Menú Principal",
      leaveGame: "Salir de la partida",
      leaveGameConfirm: "¿Seguro que quieres salir de esta partida? Perderás el progreso de esta partida.",
      // Game phases
      timeToSubmit: "Tiempo para Enviar Respuesta",
      timeToVote: "Tiempo para Votar",
      strategyTip: "Consejo Estratégico",
      strategyText: "Crea una respuesta que suene plausible pero que no sea demasiado obvia. ¡Piensa en lo que otros jugadores podrían esperar que sea la respuesta real!",
      typeFakeAnswer: "Escribe tu respuesta falsa aquí... ¡Hazla convincente!",
      submitYourAnswer: "Enviar Tu Respuesta",
      players: "Jugadores",
      you: "Tú",
      writing: "Escribiendo...",
      voting: "Votando...",
      waiting: "Esperando...",
      whichCorrect: "¿Cuál es la respuesta correcta?",
      chooseAnswer: "Elige la respuesta que crees que es correcta. ¡Ganarás puntos por acertar!",
      yourResults: "Tus Resultados de Esta Ronda",
      pointsEarned: "Puntos Ganados:",
      correctVote: "¡Voto Correcto! ✓",
      correctlyIdentified: "¡Identificaste correctamente la respuesta real!",
      roundSummary: "Resumen de la Ronda",
      noOneFooled: "Nadie fue engañado por tu respuesta esta ronda, ¡pero aún puedes ganar puntos votando correctamente!",
      allAnswersRevealed: "Todas las Respuestas Reveladas",
      votes: "votos",
      answer: "Respuesta",
      currentScoreboard: "Clasificación Actual",
      host: "Anfitrión",
      points: "puntos",
      playerReadiness: "Preparación de Jugadores",
      getReady: "¡Prepárate para crear una respuesta falsa!",
      goalText: "¡Tu objetivo es crear una respuesta falsa convincente que engañe a otros jugadores!",
      howToPlay: "Cómo jugar:",
      howToPlay1: "Escribe una respuesta falsa que suene creíble",
      howToPlay2: "Intenta engañar a otros jugadores para que voten por tu respuesta",
      howToPlay3: "Ganarás puntos por cada jugador que engañes",
      howToPlay4: "También ganas puntos si adivinas la respuesta correcta",
      startWriting: "Comenzar a Escribir Tu Respuesta",
      readingTime: "Tiempo de Lectura",
      submitted: "Enviado",
      incorrectVote: "Voto Incorrecto",
      youWereTricked: "Fuiste engañado por",
      fakeAnswer: " con su respuesta falsa",
      didNotVoteCorrect: "No votaste por la respuesta correcta",
      youTricked: "¡Engañaste a Jugadores! 🎯",
      fooledPlayers: "jugador engañado",
      roundSummaryNote: "Resumen de la Ronda",
      noOneFooledNote: "¡Nadie fue engañado por tu respuesta esta ronda, pero aún puedes ganar puntos votando correctamente!",
      ready: "Listo",
      waitingOthers: "Esperando a los otros jugadores",
      readyNextRound: "Estoy Listo para la Siguiente Ronda"
    },

    // Store
    store: {
      title: "Tienda",
      questionPacks: "Paquetes de Preguntas",
      free: "Gratis",
      premium: "Premium",
      preview: "Vista Previa",
      buy: "Comprar",
      download: "Descargar",
      owned: "Poseído",
      back: "Volver"
    },

    // Leaderboard
    leaderboard: {
      title: "Clasificación",
      weekly: "Semanal",
      monthly: "Mensual",
      allTime: "Histórica",
      rank: "Posición",
      player: "Jugador",
      score: "Puntuación",
      guest: "Invitado",
      back: "Volver"
    },

    // Question Packs
    packs: {
      popCulture: "Cultura Popular",
      travelPlaces: "Viajes y Lugares",
      impossible: "Preguntas Impossibles",
      trollCorner: "Rincón del Troll",
      grandparents: "Para Jugar con los Abuelos"
    },

    // Common
    common: {
      loading: "Cargando...",
      error: "Error",
      retry: "Reintentar",
      confirm: "Confirmar",
      cancel: "Cancelar",
      yes: "Sí",
      no: "No",
      ok: "OK",
      of: "de"
    }
  }
};

export type Language = 'en' | 'es';
export type TranslationKey = keyof typeof translations.en;

class I18nManager {
  private currentLanguage: Language = 'en';
  
  constructor() {
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('littleLiesLanguage') as Language;
    if (savedLang && translations[savedLang]) {
      this.currentLanguage = savedLang;
    }
  }

  setLanguage(lang: Language) {
    this.currentLanguage = lang;
    localStorage.setItem('littleLiesLanguage', lang);
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: any = translations[this.currentLanguage];
    
    for (const k of keys) {
      value = value?.[k];
      if (!value) break;
    }
    
    if (typeof value !== 'string') {
      return typeof value === 'undefined' ? key : value;
    }

    if (!params) {
      return value;
    }

    return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
      const regex = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
      return acc.replace(regex, String(paramValue));
    }, value);
  }
}

export const i18n = new I18nManager();

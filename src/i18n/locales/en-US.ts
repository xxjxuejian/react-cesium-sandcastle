const enUS = {
  mapTools: {
    title: "Map tools",
    basemap: "Basemap",
    source: "Map source",
    layerType: "Layer type",
    tianditu: "Tianditu",
    vector: "Vector",
    imagery: "Imagery",
    osmHint: "Switch to Tianditu for imagery.",
    tiandituHint:
      "The basemap and matching labels switch together while preserving the view.",
    keyHint: "Tianditu is not enabled. Configure an access key first.",
    resultsShort: "Results",
    closePanel: "Close panel",
    vertices: "{{count}} vertices",
    measureHint:
      "Click to add, right-click to finish, Esc to cancel. Horizontal measurement.",
    returnToMeasurement: "Return to current measurement",
    basemapError: "Basemap or labels failed to load. Retry or switch to OSM.",
    retry: "Retry",
    distance: "Distance",
    area: "Area",
    results: "Measurements",
    clear: "Clear measurements",
    measuring: "Current measurement",
    finish: "Finish",
    cancel: "Cancel",
    delete: "Delete",
    deleteResult: "Delete measurement {{id}}",
    empty: "No measurements yet",
    drawHint:
      "{{count}} vertices selected. Click to add, right-click or use Finish to complete, Esc to cancel. Horizontal measurements only.",
    errors: {
      tooFewPoints:
        "Distance needs at least 2 vertices and area needs at least 3.",
      invalidShape:
        "Invalid shape. Avoid repeated vertices, zero length, or collinear area vertices.",
      selfIntersection:
        "The polygon intersects itself. Cancel and draw its boundary in order.",
      unsupportedArea:
        "Area measurements across the date line or in polar regions are not supported.",
      unavailable:
        "The measurement layer could not be created. Reopen the page.",
    },
  },
  menu: {
    home: "Home",
    gettingStarted: {
      title: "Getting Started",
      helloWorld: "Hello World",
      resolutionScale: "Resolution Scale",
    },
    showcases: {
      title: "Showcases",
      google2dTiles: "Google 2D Tiles",
      tiandituBasic: "Tianditu Basic Test",
    },
    hangzhou: {
      title: "Hangzhou",
      regions: "Districts",
      boundaries: "Boundary Layers",
    },
    animation: {
      title: "Animation",
      clock: "Clock",
    },
    systemManagement: {
      title: "System Management",
      userManagement: "User Management",
      shelterManagement: "Shelter Management",
      airlineManagement: "Airline Management",
    },
    map: {
      title: "Map",
      offlineMap: "Offline Map",
    },
  },
  header: {
    switchLanguage: "Switch Language",
    switchTheme: "Switch Theme",
    fullScreen: "Full Screen",
    exitFullscreen: "Exit Full Screen",
    github: "GitHub",
    logout: "Sign out",
  },
  login: {
    heroTitle: "Trace the motion of spatial data",
    heroDescription:
      "Enter Cesium Sandcastle and load the scenes, tools, and system capabilities available to your account.",
    systemStatus: "Spatial services online",
    routePolicy: "Identity-based routes",
    renderEngine: "Cesium scene ready",
    title: "Sign in to the console",
    description: "Use a demo account to load the routes assigned to that role.",
    username: "Username",
    password: "Password",
    usernamePlaceholder: "Enter your username",
    passwordPlaceholder: "Enter your password",
    usernameRequired: "Enter your username",
    passwordRequired: "Enter your password",
    submit: "Enter workspace",
    loginFailed: "Sign-in failed. Try again.",
    demoTitle: "Demo accounts",
  },
};

export default enUS;

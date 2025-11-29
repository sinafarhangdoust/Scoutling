
COUNTRY2GEOID = {
    'Denmark': 104514075,
    'Netherlands': 102890719,
    'Canada': 101174742,
    'Italy': 103350119,
}

LOC2FPP = {
    'Denmark': [
        102194656,
        107956996,
        106628909,
        100951797,
        118488507,
        100482773,
        100588421,
        100537214,
        106311636,
        103096787,
        106120659,
        105969416,
        103701537,
        100658507,
    ],
    'Netherlands': [
        103100785,
        103447814,
        102434816,
        101461601,
        102922143,
        106341412,
        107078563,
        101506471,
        102438831,
        105718305
    ],
    'Canada': [
        100761630,
        101728226,
        103366113,
        102199904,
        105829038,
        101788145,
        106535873,
        103148075,
        101213860,
        100346955
    ],
    'Italy': [
        102873640,
        102334534,
        105967372,
        106742401,
        105768355,
        101544895,
        101085706,
        102361685,
        100512656,
        101353000
    ],
}

JOBS_EXTRACTION_PATTERN = (
    r'data-entity-urn="urn:li:jobPosting:(\d+)"'
    r'[\s\S]*?'
    r'href="([^"]+)"'
    r'[\s\S]*?'
    r'base-search-card__title">\s*([^<]+)'
    r'[\s\S]*?'
    r'base-search-card__subtitle"[^>]*?>\s*(?:<a[^>]*?>)?\s*([^<]+)'
)
DETAIL_LOCATION_PATTERN = r'topcard__flavor--bullet[^>]*>\s*(.*?)\s*</span>'
DETAIL_DESCRIPTION_PATTERN = r'show-more-less-html__markup[^>]*>\s*([\s\S]*?)\s*</div>'

USER_BASE_PATH = "../user_settings"

DATABASE_ENDPOINT = "postgresql://scout:scoutpass@localhost:5432/scoutling"
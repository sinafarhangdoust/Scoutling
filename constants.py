
COUNTRY2GEOID = {
    'Denmark': 104514075
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
    ]
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
DETAIL_LOCATION_PATTERN = r'topcard__flavor--bullet">\s*([^<]+)\s*</span>'
DETAIL_DESCRIPTION_PATTERN = r'show-more-less-html__markup[^"]*">\s*([\s\S]*?)\s*</div>'
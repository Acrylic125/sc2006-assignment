
# Scrape
Project folder for scraping data.

## Setup
1. Run `pnpm i`.
1. Setup `.env`. Can copy from `../app/.env`.
1. To run, run `pnpx ts-node <some_filename>`.

## Guide
1. Create possible niche tags in `poiTagTable`. Example, "Park", "History", etc...
1. Retrieve data from 
- [Tourist Attractions](https://data.gov.sg/datasets?sort=downloadsCount&resultId=1621&page=1&sidebar=true)
- [Parks data](https://data.gov.sg/datasets?query=parks&resultId=d_0542d48f0991541706b58059381a6eca&page=1)
1. Preprocess the data.
- Process the data and map it to fit the POI schema (`poiTable`).
- **NOTE:** The image url provided by the data will be a url. If the url has the domain, `yoursingapore.com`, replace it with `visitsingapore.com`. Example, `https://www.yoursingapore.com/content/dam/desktop/global/see-do-singapore/places-to-see/bras-basah-bugis-carousel01-rect.jpg` convert to `www.visitsingapore.com/content/dam/desktop/global/see-do-singapore/places-to-see/bras-basah-bugis-carousel01-rect.jpg`. 
1. Insert the `POI` and `POI Images` into the `poiTable` and `poiImagesTable` tables respectively.
1. **Manually tag** the inserted poi with the associated tag.
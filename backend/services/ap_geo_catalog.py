"""
Andhra Pradesh Statewide Geospatial & Administrative Catalog
Comprehensive directory covering all 26 verified districts, CDMA municipal bodies,
revenue mandals, major river basins, and LGD codes.
Software-only implementation; zero IoT / physical hardware required.
"""

from typing import Dict, Any, List, Optional

# Official 26 Districts of Andhra Pradesh (Reorganized Administrative Structure)
AP_DISTRICTS: Dict[str, Dict[str, Any]] = {
    "Guntur": {
        "lgd_code": 506,
        "name": "Guntur",
        "headquarters": "Guntur",
        "lat": 16.3067,
        "lon": 80.4365,
        "area_km2": 2443.0,
        "population": 2091075,
        "river_basin": "Krishna River Basin",
        "elevation_mean_m": 33.0,
        "slope_mean_deg": 1.7,
        "annual_rainfall_mm": 890,
        "municipalities": [
            {"name": "Guntur Municipal Corporation", "type": "Municipal Corporation", "wards_count": 76, "baseline_wards": 57, "has_ward_polygons": True},
            {"name": "Tenali Municipality", "type": "Special Selection Grade Municipality", "wards_count": 40, "has_ward_polygons": False},
            {"name": "Mangalagiri-Tadepalli Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Ponnur Municipality", "type": "2nd Grade Municipality", "wards_count": 31, "has_ward_polygons": False},
        ],
        "major_mandals": [
            "Guntur East", "Guntur West", "Tenali", "Mangalagiri", "Tadepalli", "Ponnur",
            "Chebrolu", "Medikonduru", "Pedakakani", "Prathipadu", "Tadikonda", "Vatticherukuru", "Duggirala", "Kollipara"
        ],
        "major_water_bodies": ["Krishna Western Delta Canals", "Guntur Channel", "Commamur Canal", "Gujjanagundla Tank", "Romperu Outfall"],
        "major_reservoirs": ["Pulichintala Project (Downstream Reach)", "Prakasam Barrage Right Bank Canals"]
    },
    "NTR (Vijayawada)": {
        "lgd_code": 750,
        "name": "NTR (Vijayawada)",
        "headquarters": "Vijayawada",
        "lat": 16.5062,
        "lon": 80.6480,
        "area_km2": 3316.0,
        "population": 2218591,
        "river_basin": "Krishna River Basin",
        "elevation_mean_m": 24.5,
        "slope_mean_deg": 1.4,
        "annual_rainfall_mm": 1030,
        "municipalities": [
            {"name": "Vijayawada Municipal Corporation", "type": "Municipal Corporation", "wards_count": 64, "has_ward_polygons": True},
            {"name": "Jaggayyapet Municipality", "type": "2nd Grade Municipality", "wards_count": 31, "has_ward_polygons": False},
            {"name": "Nandigama Nagar Panchayat", "type": "Nagar Panchayat", "wards_count": 20, "has_ward_polygons": False},
            {"name": "Tiruvuru Nagar Panchayat", "type": "Nagar Panchayat", "wards_count": 20, "has_ward_polygons": False},
        ],
        "major_mandals": ["Vijayawada Urban", "Vijayawada Rural", "Jaggayyapet", "Nandigama", "Ibrahimpatnam", "Mylavaram", "Tiruvuru", "Kanchikacherla"],
        "major_water_bodies": ["Prakasam Barrage", "Ryves Canal", "Eluru Canal", "Bandar Canal", "Budameru Rivulet"],
        "major_reservoirs": ["Prakasam Barrage", "Budameru Diversion Channel (BDC)"]
    },
    "Visakhapatnam": {
        "lgd_code": 521,
        "name": "Visakhapatnam",
        "headquarters": "Visakhapatnam",
        "lat": 17.6868,
        "lon": 83.2185,
        "area_km2": 1048.0,
        "population": 1959990,
        "river_basin": "East Flowing Coastal Rivers (Sarada & Gosthani)",
        "elevation_mean_m": 18.0,
        "slope_mean_deg": 2.8,
        "annual_rainfall_mm": 1100,
        "municipalities": [
            {"name": "Greater Visakhapatnam Municipal Corporation (GVMC)", "type": "Greater Municipal Corporation", "wards_count": 98, "has_ward_polygons": False},
            {"name": "Bheemunipatnam (Bheemili) Zone", "type": "Municipal Zone", "wards_count": 12, "has_ward_polygons": False},
        ],
        "major_mandals": ["Visakhapatnam Urban", "Maharanipeta", "Seethammadhara", "Gajuwaka", "Gopalapatnam", "Bheemunipatnam", "Pendurthi"],
        "major_water_bodies": ["Meghadrigedda Reservoir", "Mudasarlova Reservoir", "Gosthani River Outfall", "Yeleru Left Bank Canal"],
        "major_reservoirs": ["Meghadrigedda Reservoir", "Mudasarlova Reservoir", "Gambheeram Dam", "Raiwada (Supply Line)"]
    },
    "Tirupati": {
        "lgd_code": 756,
        "name": "Tirupati",
        "headquarters": "Tirupati",
        "lat": 13.6288,
        "lon": 79.4192,
        "area_km2": 9170.0,
        "population": 2196984,
        "river_basin": "Swarnamukhi & Araniar River Basins",
        "elevation_mean_m": 155.0,
        "slope_mean_deg": 3.2,
        "annual_rainfall_mm": 950,
        "municipalities": [
            {"name": "Municipal Corporation of Tirupati (MCT)", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Srikalahasti Municipality", "type": "1st Grade Municipality", "wards_count": 33, "has_ward_polygons": False},
            {"name": "Gudur Municipality", "type": "1st Grade Municipality", "wards_count": 33, "has_ward_polygons": False},
            {"name": "Venkatagiri Municipality", "type": "2nd Grade Municipality", "wards_count": 25, "has_ward_polygons": False},
            {"name": "Naidupet Municipality", "type": "3rd Grade Municipality", "wards_count": 25, "has_ward_polygons": False},
        ],
        "major_mandals": ["Tirupati Urban", "Tirupati Rural", "Chandragiri", "Srikalahasti", "Renigunta", "Gudur", "Sullurpeta", "Venkatagiri"],
        "major_water_bodies": ["Swarnamukhi River", "Pulicat Lake (Northern Reach)", "Kalyani Reservoir", "Mallemadugu Reservoir"],
        "major_reservoirs": ["Kalyani Dam", "Mallemadugu Reservoir", "Kalangi Reservoir", "Araniar Dam"]
    },
    "Kurnool": {
        "lgd_code": 511,
        "name": "Kurnool",
        "headquarters": "Kurnool",
        "lat": 15.8281,
        "lon": 78.0373,
        "area_km2": 7980.0,
        "population": 2271686,
        "river_basin": "Tungabhadra & Handri Basins",
        "elevation_mean_m": 273.0,
        "slope_mean_deg": 2.1,
        "annual_rainfall_mm": 670,
        "municipalities": [
            {"name": "Kurnool Municipal Corporation", "type": "Municipal Corporation", "wards_count": 52, "has_ward_polygons": False},
            {"name": "Adoni Municipality", "type": "Special Grade Municipality", "wards_count": 42, "has_ward_polygons": False},
            {"name": "Yemmiganur Municipality", "type": "1st Grade Municipality", "wards_count": 34, "has_ward_polygons": False},
        ],
        "major_mandals": ["Kurnool Urban", "Kurnool Rural", "Adoni", "Yemmiganur", "Kodumur", "Pattikonda", "Alur", "Mantralayam"],
        "major_water_bodies": ["Tungabhadra River", "Handri River", "K.C. Canal (Kurnool-Cuddapah Canal)", "Gajuladinne Project"],
        "major_reservoirs": ["Srisailam Reservoir (Northern Flank)", "Gajuladinne Project (GDP)", "Sunkesula Barrage"]
    },
    "Kakinada": {
        "lgd_code": 747,
        "name": "Kakinada",
        "headquarters": "Kakinada",
        "lat": 16.9891,
        "lon": 82.2475,
        "area_km2": 3019.0,
        "population": 2092374,
        "river_basin": "Godavari Eastern Delta Basin",
        "elevation_mean_m": 4.5,
        "slope_mean_deg": 0.8,
        "annual_rainfall_mm": 1140,
        "municipalities": [
            {"name": "Kakinada Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Samalkot Municipality", "type": "2nd Grade Municipality", "wards_count": 31, "has_ward_polygons": False},
            {"name": "Pithapuram Municipality", "type": "2nd Grade Municipality", "wards_count": 30, "has_ward_polygons": False},
            {"name": "Peddapuram Municipality", "type": "2nd Grade Municipality", "wards_count": 28, "has_ward_polygons": False},
            {"name": "Tuni Municipality", "type": "1st Grade Municipality", "wards_count": 30, "has_ward_polygons": False},
        ],
        "major_mandals": ["Kakinada Urban", "Kakinada Rural", "Samalkot", "Pithapuram", "Peddapuram", "Tuni", "Prathipadu", "Jaggampeta"],
        "major_water_bodies": ["Yeleru Left Main Canal", "Kakinada Bay Salt Creeks", "Coringa Mangrove Channels"],
        "major_reservoirs": ["Yeleru Reservoir", "Surampalem Reservoir"]
    },
    "Sri Potti Sriramulu Nellore": {
        "lgd_code": 515,
        "name": "Sri Potti Sriramulu Nellore",
        "headquarters": "Nellore",
        "lat": 14.4426,
        "lon": 79.9865,
        "area_km2": 10441.0,
        "population": 2469712,
        "river_basin": "Pennar River Basin",
        "elevation_mean_m": 22.0,
        "slope_mean_deg": 1.2,
        "annual_rainfall_mm": 1080,
        "municipalities": [
            {"name": "Nellore Municipal Corporation", "type": "Municipal Corporation", "wards_count": 54, "has_ward_polygons": False},
            {"name": "Kavali Municipality", "type": "1st Grade Municipality", "wards_count": 40, "has_ward_polygons": False},
            {"name": "Atmakur Municipality", "type": "2nd Grade Municipality", "wards_count": 23, "has_ward_polygons": False},
        ],
        "major_mandals": ["Nellore Urban", "Nellore Rural", "Kavali", "Atmakur", "Kovur", "Indukurpet", "Buchireddypalem", "Allur"],
        "major_water_bodies": ["Pennar River", "Kanigiri Reservoir", "Sarvepalli Reservoir", "Buckingham Canal"],
        "major_reservoirs": ["Somasila Reservoir", "Kandaleru Reservoir", "Nellore Anicut"]
    },
    "Bapatla": {
        "lgd_code": 751,
        "name": "Bapatla",
        "headquarters": "Bapatla",
        "lat": 15.9042,
        "lon": 80.4678,
        "area_km2": 3829.0,
        "population": 1586918,
        "river_basin": "Krishna Southern Delta & Coastal Plain",
        "elevation_mean_m": 5.0,
        "slope_mean_deg": 0.5,
        "annual_rainfall_mm": 930,
        "municipalities": [
            {"name": "Bapatla Municipality", "type": "1st Grade Municipality", "wards_count": 34, "has_ward_polygons": False},
            {"name": "Chirala Municipality", "type": "Selection Grade Municipality", "wards_count": 33, "has_ward_polygons": False},
            {"name": "Repalle Municipality", "type": "2nd Grade Municipality", "wards_count": 28, "has_ward_polygons": False},
        ],
        "major_mandals": ["Bapatla", "Chirala", "Repalle", "Vemuru", "Nizampatnam", "Karlapalem", "Karamchedu", "Vetapalem"],
        "major_water_bodies": ["Romperu River", "Commamur Canal", "Nizampatnam Creek", "Tungabhadra Drain"],
        "major_reservoirs": ["Coastal Drainage Regulators", "Kankatapalem Sluices"]
    },
    "Palnadu": {
        "lgd_code": 752,
        "name": "Palnadu",
        "headquarters": "Narasaraopet",
        "lat": 16.2361,
        "lon": 80.0528,
        "area_km2": 7298.0,
        "population": 2041723,
        "river_basin": "Krishna Right Bank / Chandravanka Basin",
        "elevation_mean_m": 88.0,
        "slope_mean_deg": 2.4,
        "annual_rainfall_mm": 770,
        "municipalities": [
            {"name": "Narasaraopet Municipality", "type": "Special Grade Municipality", "wards_count": 34, "has_ward_polygons": False},
            {"name": "Chilakaluripet Municipality", "type": "1st Grade Municipality", "wards_count": 34, "has_ward_polygons": False},
            {"name": "Sattenapalle Municipality", "type": "1st Grade Municipality", "wards_count": 31, "has_ward_polygons": False},
            {"name": "Vinukonda Municipality", "type": "2nd Grade Municipality", "wards_count": 32, "has_ward_polygons": False},
            {"name": "Piduguralla Municipality", "type": "2nd Grade Municipality", "wards_count": 33, "has_ward_polygons": False},
            {"name": "Macherla Municipality", "type": "2nd Grade Municipality", "wards_count": 31, "has_ward_polygons": False},
        ],
        "major_mandals": ["Narasaraopet", "Chilakaluripet", "Sattenapalle", "Vinukonda", "Piduguralla", "Macherla", "Gurazala", "Dachepalle"],
        "major_water_bodies": ["Nagarjuna Sagar Right Canal", "Chandravanka River", "Nallamala Streams"],
        "major_reservoirs": ["Nagarjuna Sagar (Right Bank Reach)", "Bugga Vagu Reservoir"]
    },
    "Prakasam": {
        "lgd_code": 517,
        "name": "Prakasam",
        "headquarters": "Ongole",
        "lat": 15.5057,
        "lon": 80.0499,
        "area_km2": 14322.0,
        "population": 2288026,
        "river_basin": "Gundlakamma & Musi Basins",
        "elevation_mean_m": 45.0,
        "slope_mean_deg": 1.6,
        "annual_rainfall_mm": 810,
        "municipalities": [
            {"name": "Ongole Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Markapur Municipality", "type": "2nd Grade Municipality", "wards_count": 35, "has_ward_polygons": False},
            {"name": "Giddalur Nagar Panchayat", "type": "Nagar Panchayat", "wards_count": 20, "has_ward_polygons": False},
            {"name": "Kanigiri Nagar Panchayat", "type": "Nagar Panchayat", "wards_count": 20, "has_ward_polygons": False},
        ],
        "major_mandals": ["Ongole", "Markapur", "Kanigiri", "Giddalur", "Kandukur", "Chimakurthy", "Singarayakonda", "Podili"],
        "major_water_bodies": ["Gundlakamma River", "Musi River", "Obulreddy Gundlakamma Reservoir", "Rallapadu Reservoir"],
        "major_reservoirs": ["Gundlakamma Reservoir", "Veligonda Project (Under Construction)", "Rallapadu Project"]
    },
    "East Godavari": {
        "lgd_code": 505,
        "name": "East Godavari",
        "headquarters": "Rajamahendravaram",
        "lat": 17.0005,
        "lon": 81.8040,
        "area_km2": 2561.0,
        "population": 1832334,
        "river_basin": "Godavari River Basin",
        "elevation_mean_m": 22.0,
        "slope_mean_deg": 1.1,
        "annual_rainfall_mm": 1180,
        "municipalities": [
            {"name": "Rajamahendravaram Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Nidadavole Municipality", "type": "2nd Grade Municipality", "wards_count": 28, "has_ward_polygons": False},
            {"name": "Kovvur Municipality", "type": "2nd Grade Municipality", "wards_count": 23, "has_ward_polygons": False},
        ],
        "major_mandals": ["Rajamahendravaram Urban", "Rajamahendravaram Rural", "Kadiam", "Kovvur", "Nidadavole", "Rajanagaram", "Chagallu"],
        "major_water_bodies": ["Godavari Main River", "Sir Arthur Cotton Barrage", "Torrigedda Pumping Scheme", "Central Delta Canals"],
        "major_reservoirs": ["Sir Arthur Cotton Barrage (Dowleswaram)", "Polavaram Dam (Downstream Reservoir Reach)"]
    },
    "West Godavari": {
        "lgd_code": 523,
        "name": "West Godavari",
        "headquarters": "Bhimavaram",
        "lat": 16.5449,
        "lon": 81.5212,
        "area_km2": 2178.0,
        "population": 1779935,
        "river_basin": "Godavari Western Delta Basin",
        "elevation_mean_m": 4.0,
        "slope_mean_deg": 0.4,
        "annual_rainfall_mm": 1120,
        "municipalities": [
            {"name": "Bhimavaram Municipality", "type": "Selection Grade Municipality", "wards_count": 39, "has_ward_polygons": False},
            {"name": "Tadepalligudem Municipality", "type": "Selection Grade Municipality", "wards_count": 35, "has_ward_polygons": False},
            {"name": "Tanuku Municipality", "type": "1st Grade Municipality", "wards_count": 34, "has_ward_polygons": False},
            {"name": "Palakollu Municipality", "type": "1st Grade Municipality", "wards_count": 35, "has_ward_polygons": False},
            {"name": "Narsapur Municipality", "type": "1st Grade Municipality", "wards_count": 31, "has_ward_polygons": False},
        ],
        "major_mandals": ["Bhimavaram", "Tadepalligudem", "Tanuku", "Palakollu", "Narsapur", "Attili", "Penumantra", "Achanta"],
        "major_water_bodies": ["Vashishta Godavari", "Western Delta Main Canal", "Gosthani Canal", "Kovvada Canal"],
        "major_reservoirs": ["Western Delta Network", "Peravali Sluice Gates"]
    },
    "Eluru": {
        "lgd_code": 749,
        "name": "Eluru",
        "headquarters": "Eluru",
        "lat": 16.7107,
        "lon": 81.0952,
        "area_km2": 6579.0,
        "population": 2071700,
        "river_basin": "Tammileru & Kolleru Lake Wetland Basin",
        "elevation_mean_m": 19.0,
        "slope_mean_deg": 1.2,
        "annual_rainfall_mm": 1050,
        "municipalities": [
            {"name": "Eluru Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Nuzvid Municipality", "type": "1st Grade Municipality", "wards_count": 32, "has_ward_polygons": False},
            {"name": "Jangareddygudem Nagar Panchayat", "type": "Nagar Panchayat", "wards_count": 20, "has_ward_polygons": False},
        ],
        "major_mandals": ["Eluru Urban", "Eluru Rural", "Nuzvid", "Jangareddygudem", "Pedavegi", "Denduluru", "Chintalapudi", "Kaikalur"],
        "major_water_bodies": ["Kolleru Lake (Largest Freshwater Lake)", "Tammileru River", "Eluru Canal", "Krishna-Eluru Interlink"],
        "major_reservoirs": ["Tammileru Reservoir", "Yerrakalva Reservoir"]
    },
    "Krishna": {
        "lgd_code": 510,
        "name": "Krishna",
        "headquarters": "Machilipatnam",
        "lat": 16.1875,
        "lon": 81.1389,
        "area_km2": 3775.0,
        "population": 1735079,
        "river_basin": "Krishna Delta & Coastal Basin",
        "elevation_mean_m": 8.0,
        "slope_mean_deg": 0.6,
        "annual_rainfall_mm": 1040,
        "municipalities": [
            {"name": "Machilipatnam Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Gudivada Municipality", "type": "Special Grade Municipality", "wards_count": 36, "has_ward_polygons": False},
            {"name": "Pedana Municipality", "type": "3rd Grade Municipality", "wards_count": 23, "has_ward_polygons": False},
            {"name": "Vuyyuru Municipality", "type": "Nagar Panchayat", "wards_count": 20, "has_ward_polygons": False},
        ],
        "major_mandals": ["Machilipatnam", "Gudivada", "Pedana", "Vuyyuru", "Pamarru", "Avanigadda", "Challapalli", "Nagayalanka"],
        "major_water_bodies": ["Krishna River Estuary", "Bandar Canal", "Upputeru River", "Diviseema Coastal Inlets"],
        "major_reservoirs": ["Puligadda Aqueduct", "Campbell Aqueduct"]
    },
    "Dr. B.R. Ambedkar Konaseema": {
        "lgd_code": 748,
        "name": "Dr. B.R. Ambedkar Konaseema",
        "headquarters": "Amalapuram",
        "lat": 16.5787,
        "lon": 82.0061,
        "area_km2": 2083.0,
        "population": 1719093,
        "river_basin": "Godavari Central & Southern Delta",
        "elevation_mean_m": 3.0,
        "slope_mean_deg": 0.3,
        "annual_rainfall_mm": 1220,
        "municipalities": [
            {"name": "Amalapuram Municipality", "type": "1st Grade Municipality", "wards_count": 30, "has_ward_polygons": False},
            {"name": "Ramachandrapuram Municipality", "type": "2nd Grade Municipality", "wards_count": 28, "has_ward_polygons": False},
            {"name": "Mandapeta Municipality", "type": "2nd Grade Municipality", "wards_count": 30, "has_ward_polygons": False},
        ],
        "major_mandals": ["Amalapuram", "Ramachandrapuram", "Mandapeta", "Razole", "Mummidivaram", "Kothapeta", "Ravulapalem", "Malikipuram"],
        "major_water_bodies": ["Gautami Godavari", "Vainateya Godavari", "Gannavaram Aqueduct", "Central Delta Canals"],
        "major_reservoirs": ["Dowleswaram Central Arm", "Bobbarlanka Sluices"]
    },
    "Anakapalli": {
        "lgd_code": 746,
        "name": "Anakapalli",
        "headquarters": "Anakapalli",
        "lat": 17.6913,
        "lon": 83.0039,
        "area_km2": 4292.0,
        "population": 1520121,
        "river_basin": "Sarada & Varaha Basins",
        "elevation_mean_m": 29.0,
        "slope_mean_deg": 2.0,
        "annual_rainfall_mm": 1050,
        "municipalities": [
            {"name": "Anakapalli (GVMC Zone 7)", "type": "Municipal Zone", "wards_count": 15, "has_ward_polygons": False},
            {"name": "Elamanchili Municipality", "type": "3rd Grade Municipality", "wards_count": 25, "has_ward_polygons": False},
            {"name": "Narsipatnam Municipality", "type": "3rd Grade Municipality", "wards_count": 28, "has_ward_polygons": False},
        ],
        "major_mandals": ["Anakapalli", "Elamanchili", "Narsipatnam", "Kasimkota", "Chodavaram", "Parawada", "Atchutapuram", "Payakaraopeta"],
        "major_water_bodies": ["Sarada River", "Varaha River", "Kalyanapulova Reservoir", "Raiwada Left Canal"],
        "major_reservoirs": ["Raiwada Reservoir", "Kalyanapulova Reservoir", "Konam Dam"]
    },
    "Srikakulam": {
        "lgd_code": 519,
        "name": "Srikakulam",
        "headquarters": "Srikakulam",
        "lat": 18.2949,
        "lon": 83.8938,
        "area_km2": 4591.0,
        "population": 2191471,
        "river_basin": "Nagavali & Vamsadhara River Basins",
        "elevation_mean_m": 35.0,
        "slope_mean_deg": 2.2,
        "annual_rainfall_mm": 1130,
        "municipalities": [
            {"name": "Srikakulam Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Amadalavalasa Municipality", "type": "3rd Grade Municipality", "wards_count": 23, "has_ward_polygons": False},
            {"name": "Ichchapuram Municipality", "type": "3rd Grade Municipality", "wards_count": 23, "has_ward_polygons": False},
            {"name": "Palasa-Kasibugga Municipality", "type": "2nd Grade Municipality", "wards_count": 31, "has_ward_polygons": False},
        ],
        "major_mandals": ["Srikakulam", "Amadalavalasa", "Palasa", "Tekkali", "Narasannapeta", "Ichchapuram", "Sompeta", "Gara"],
        "major_water_bodies": ["Nagavali River", "Vamsadhara River", "Madduvalasa Reservoir", "Narayanapuram Anicut"],
        "major_reservoirs": ["Gotta Barrage (Vamsadhara Project)", "Madduvalasa Reservoir", "Thotapalli Right Canal (Reach)"]
    },
    "Vizianagaram": {
        "lgd_code": 520,
        "name": "Vizianagaram",
        "headquarters": "Vizianagaram",
        "lat": 18.1124,
        "lon": 83.4144,
        "area_km2": 3845.0,
        "population": 1930811,
        "river_basin": "Champavathi & Gosthani Basins",
        "elevation_mean_m": 66.0,
        "slope_mean_deg": 2.5,
        "annual_rainfall_mm": 1090,
        "municipalities": [
            {"name": "Vizianagaram Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Bobbili Municipality", "type": "2nd Grade Municipality", "wards_count": 31, "has_ward_polygons": False},
            {"name": "Salur Municipality", "type": "2nd Grade Municipality", "wards_count": 29, "has_ward_polygons": False},
        ],
        "major_mandals": ["Vizianagaram", "Bobbili", "Salur", "Cheepurupalli", "Gajapathinagaram", "Kothavalasa", "Srungavarapukota", "Nellimarla"],
        "major_water_bodies": ["Champavathi River", "Vegavathi River", "Thatipudi Reservoir", "Andra Reservoir"],
        "major_reservoirs": ["Thatipudi Reservoir", "Andra Reservoir", "Denkada Anicut"]
    },
    "Parvathipuram Manyam": {
        "lgd_code": 744,
        "name": "Parvathipuram Manyam",
        "headquarters": "Parvathipuram",
        "lat": 18.7797,
        "lon": 83.4286,
        "area_km2": 3659.0,
        "population": 925340,
        "river_basin": "Nagavali & Suvarnamukhi Upper Basins",
        "elevation_mean_m": 120.0,
        "slope_mean_deg": 3.8,
        "annual_rainfall_mm": 1180,
        "municipalities": [
            {"name": "Parvathipuram Municipality", "type": "2nd Grade Municipality", "wards_count": 30, "has_ward_polygons": False},
            {"name": "Palakonda Nagar Panchayat", "type": "Nagar Panchayat", "wards_count": 20, "has_ward_polygons": False},
        ],
        "major_mandals": ["Parvathipuram", "Palakonda", "Salur (Manyam)", "Kurupam", "Seethanagaram", "Jiyyammavalasa", "Bhamini"],
        "major_water_bodies": ["Nagavali River Upper Reach", "Suvarnamukhi River", "Vegavathi Stream", "Thotapalli Barrage"],
        "major_reservoirs": ["Thotapalli Barrage Project", "Janjhavathi Rubber Dam"]
    },
    "Alluri Sitharama Raju": {
        "lgd_code": 745,
        "name": "Alluri Sitharama Raju",
        "headquarters": "Paderu",
        "lat": 18.0827,
        "lon": 82.6644,
        "area_km2": 12251.0,
        "population": 953960,
        "river_basin": "Godavari (Sabari / Sileru) Basin",
        "elevation_mean_m": 850.0,
        "slope_mean_deg": 6.5,
        "annual_rainfall_mm": 1350,
        "municipalities": [
            {"name": "Paderu Nagar Panchayat", "type": "Nagar Panchayat", "wards_count": 20, "has_ward_polygons": False},
            {"name": "Rampachodavaram Major Gram Panchayat", "type": "Tribal Agency HQ", "wards_count": 18, "has_ward_polygons": False},
        ],
        "major_mandals": ["Paderu", "Araku Valley", "Ananthagiri", "Rampachodavaram", "Chintapalle", "Maredumilli", "Kunavaram", "VR Puram"],
        "major_water_bodies": ["Sabari River", "Sileru River", "Machkund River", "Polavaram Upper Gorge Reservoir"],
        "major_reservoirs": ["Jalaput Dam", "Balimela Reservoir (Interstate)", "Upper Sileru Project", "Donkarayi Dam", "Polavaram Project Backwaters"]
    },
    "YSR Kadapa": {
        "lgd_code": 504,
        "name": "YSR Kadapa",
        "headquarters": "Kadapa",
        "lat": 14.4673,
        "lon": 78.8242,
        "area_km2": 11228.0,
        "population": 2060654,
        "river_basin": "Pennar Central Basin",
        "elevation_mean_m": 138.0,
        "slope_mean_deg": 2.2,
        "annual_rainfall_mm": 700,
        "municipalities": [
            {"name": "Kadapa Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Proddatur Municipality", "type": "Special Grade Municipality", "wards_count": 41, "has_ward_polygons": False},
            {"name": "Pulivendula Municipality", "type": "1st Grade Municipality", "wards_count": 33, "has_ward_polygons": False},
            {"name": "Jammalamadugu Municipality", "type": "2nd Grade Municipality", "wards_count": 20, "has_ward_polygons": False},
            {"name": "Badvel Municipality", "type": "2nd Grade Municipality", "wards_count": 20, "has_ward_polygons": False},
        ],
        "major_mandals": ["Kadapa Urban", "Kadapa Rural", "Proddatur", "Pulivendula", "Jammalamadugu", "Badvel", "Mydukur", "Kamalapuram"],
        "major_water_bodies": ["Pennar River", "Kunduru River", "Papagni River", "Mylavaram Reservoir", "Gandikota Reservoir"],
        "major_reservoirs": ["Gandikota Reservoir", "Mylavaram Reservoir", "Bramhamsagar Reservoir (Telugu Ganga)", "Annamayya Project (Upstream Reach)"]
    },
    "Annamayya": {
        "lgd_code": 755,
        "name": "Annamayya",
        "headquarters": "Rayachoti",
        "lat": 14.0569,
        "lon": 78.7523,
        "area_km2": 7954.0,
        "population": 1697308,
        "river_basin": "Cheyyeru & Bahuda River Basins",
        "elevation_mean_m": 380.0,
        "slope_mean_deg": 3.1,
        "annual_rainfall_mm": 740,
        "municipalities": [
            {"name": "Rayachoti Municipality", "type": "1st Grade Municipality", "wards_count": 34, "has_ward_polygons": False},
            {"name": "Madanapalle Municipality", "type": "Selection Grade Municipality", "wards_count": 35, "has_ward_polygons": False},
            {"name": "Rajampet Municipality", "type": "2nd Grade Municipality", "wards_count": 29, "has_ward_polygons": False},
        ],
        "major_mandals": ["Rayachoti", "Madanapalle", "Rajampet", "Railway Koduru", "Pileru", "Galiveedu", "Nimmanapalle", "Tamballapalle"],
        "major_water_bodies": ["Cheyyeru River", "Bahuda River", "Annamayya Project (Restoration Reach)", "Veligallu Reservoir"],
        "major_reservoirs": ["Veligallu Reservoir", "Pincha Reservoir", "Srinivasa Sagar"]
    },
    "Chittoor": {
        "lgd_code": 503,
        "name": "Chittoor",
        "headquarters": "Chittoor",
        "lat": 13.2172,
        "lon": 79.1003,
        "area_km2": 6855.0,
        "population": 1872951,
        "river_basin": "Palar & Koundinya River Basins",
        "elevation_mean_m": 330.0,
        "slope_mean_deg": 2.9,
        "annual_rainfall_mm": 920,
        "municipalities": [
            {"name": "Chittoor Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Nagari Municipality", "type": "2nd Grade Municipality", "wards_count": 29, "has_ward_polygons": False},
            {"name": "Palamaner Municipality", "type": "2nd Grade Municipality", "wards_count": 24, "has_ward_polygons": False},
            {"name": "Punganur Municipality", "type": "2nd Grade Municipality", "wards_count": 24, "has_ward_polygons": False},
            {"name": "Kuppam Municipality", "type": "3rd Grade Municipality", "wards_count": 25, "has_ward_polygons": False},
        ],
        "major_mandals": ["Chittoor Urban", "Chittoor Rural", "Palamaner", "Punganur", "Nagari", "Kuppam", "Bangarupalem", "GD Nellore"],
        "major_water_bodies": ["Palar River Reach", "Koundinya River", "NTR Jalasayam", "Adavipalli Reservoir"],
        "major_reservoirs": ["NTR Jalasayam (Kalavagunta)", "Adavipalli Reservoir", "Krishnapuram Project"]
    },
    "Ananthapuramu": {
        "lgd_code": 502,
        "name": "Ananthapuramu",
        "headquarters": "Anantapur",
        "lat": 14.6819,
        "lon": 77.6006,
        "area_km2": 10205.0,
        "population": 2241105,
        "river_basin": "Pennar & Hagari Basins",
        "elevation_mean_m": 335.0,
        "slope_mean_deg": 2.0,
        "annual_rainfall_mm": 550,
        "municipalities": [
            {"name": "Anantapur Municipal Corporation", "type": "Municipal Corporation", "wards_count": 50, "has_ward_polygons": False},
            {"name": "Guntakal Municipality", "type": "Special Grade Municipality", "wards_count": 37, "has_ward_polygons": False},
            {"name": "Tadipatri Municipality", "type": "1st Grade Municipality", "wards_count": 34, "has_ward_polygons": False},
            {"name": "Rayadurg Municipality", "type": "2nd Grade Municipality", "wards_count": 32, "has_ward_polygons": False},
            {"name": "Kalyandurg Municipality", "type": "3rd Grade Municipality", "wards_count": 24, "has_ward_polygons": False},
        ],
        "major_mandals": ["Anantapur Urban", "Anantapur Rural", "Guntakal", "Tadipatri", "Rayadurg", "Kalyandurg", "Uravakonda", "Bukkarayasamudram"],
        "major_water_bodies": ["Pennar River Upper Valley", "Handri-Neeva Sujala Sravanthi (HNSS) Main Canal", "Mid Pennar Reservoir"],
        "major_reservoirs": ["Mid Pennar Reservoir (MPR Dam)", "Penna Ahobilam Balancing Reservoir (PABR)", "Bhairavanitippa Project (BTP)"]
    },
    "Sri Sathya Sai": {
        "lgd_code": 754,
        "name": "Sri Sathya Sai",
        "headquarters": "Puttaparthi",
        "lat": 14.1678,
        "lon": 77.8118,
        "area_km2": 8925.0,
        "population": 1840002,
        "river_basin": "Chitravathi & Pennar Tributaries",
        "elevation_mean_m": 480.0,
        "slope_mean_deg": 2.6,
        "annual_rainfall_mm": 580,
        "municipalities": [
            {"name": "Hindupur Municipality", "type": "Special Grade Municipality", "wards_count": 38, "has_ward_polygons": False},
            {"name": "Dharmavaram Municipality", "type": "Special Grade Municipality", "wards_count": 40, "has_ward_polygons": False},
            {"name": "Kadiri Municipality", "type": "1st Grade Municipality", "wards_count": 36, "has_ward_polygons": False},
            {"name": "Puttaparthi Municipality", "type": "2nd Grade Municipality", "wards_count": 20, "has_ward_polygons": False},
            {"name": "Madakasira Nagar Panchayat", "type": "Nagar Panchayat", "wards_count": 20, "has_ward_polygons": False},
        ],
        "major_mandals": ["Puttaparthi", "Hindupur", "Dharmavaram", "Kadiri", "Penukonda", "Bukkapatnam", "Gorantla", "Madakasira"],
        "major_water_bodies": ["Chitravathi River", "Kushavathi River", "Bukkapatnam Cheruvu (Major Irrigation Tank)", "Gollapalli Reservoir"],
        "major_reservoirs": ["Chitravathi Balancing Reservoir (CBR)", "Gollapalli Reservoir (HNSS)", "Marala Reservoir"]
    },
    "Nandyal": {
        "lgd_code": 753,
        "name": "Nandyal",
        "headquarters": "Nandyal",
        "lat": 15.4774,
        "lon": 78.4836,
        "area_km2": 9682.0,
        "population": 1781777,
        "river_basin": "Kunduru & Krishna-Tungabhadra Lower Basin",
        "elevation_mean_m": 203.0,
        "slope_mean_deg": 2.0,
        "annual_rainfall_mm": 740,
        "municipalities": [
            {"name": "Nandyal Municipal Corporation", "type": "Municipal Corporation", "wards_count": 42, "has_ward_polygons": False},
            {"name": "Dhone Municipality", "type": "2nd Grade Municipality", "wards_count": 32, "has_ward_polygons": False},
            {"name": "Nandikotkur Municipality", "type": "3rd Grade Municipality", "wards_count": 29, "has_ward_polygons": False},
            {"name": "Allagadda Municipality", "type": "3rd Grade Municipality", "wards_count": 27, "has_ward_polygons": False},
            {"name": "Atmakur (K) Municipality", "type": "3rd Grade Municipality", "wards_count": 23, "has_ward_polygons": False},
        ],
        "major_mandals": ["Nandyal", "Dhone", "Nandikotkur", "Allagadda", "Atmakur", "Banaganapalle", "Koilkuntla", "Panyam", "Mahanandi"],
        "major_water_bodies": ["Kunduru River", "K.C. Canal Main Trunk", "Srisailam Reservoir Forebay", "Gorakallu Balancing Reservoir"],
        "major_reservoirs": ["Srisailam Dam (Main Dam & Right Bank Power House)", "Gorakallu Reservoir", "Owk Reservoir", "Alaganuru Balancing Reservoir"]
    }
}

def get_all_ap_districts() -> List[Dict[str, Any]]:
    """Return catalog list of all 26 official Andhra Pradesh districts."""
    out = []
    for d_name, d_info in AP_DISTRICTS.items():
        out.append({
            "name": d_name,
            "lgd_code": d_info["lgd_code"],
            "headquarters": d_info["headquarters"],
            "lat": d_info["lat"],
            "lon": d_info["lon"],
            "area_km2": d_info["area_km2"],
            "population": d_info["population"],
            "river_basin": d_info["river_basin"],
            "municipalities_count": len(d_info["municipalities"]),
            "mandals_count": len(d_info["major_mandals"]),
        })
    out.sort(key=lambda x: x["name"])
    return out

def get_district_details(district_name: str) -> Optional[Dict[str, Any]]:
    """Get full hierarchical details for a specific district."""
    for d_name, d_info in AP_DISTRICTS.items():
        if d_name.lower() == district_name.lower() or d_name.lower().startswith(district_name.lower()):
            return d_info
    return None

def search_ap_locations(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    """
    Search across districts, municipalities, mandals, and GMC wards.
    Returns matched entities with type, administrative level, and coordinates.
    """
    q = query.strip().lower()
    results = []

    # 1. District matches
    for d_name, d_info in AP_DISTRICTS.items():
        if q in d_name.lower() or q in d_info["headquarters"].lower():
            results.append({
                "type": "district",
                "display_name": f"{d_name} District",
                "district": d_name,
                "lat": d_info["lat"],
                "lon": d_info["lon"],
                "lgd_code": d_info["lgd_code"],
                "administrative_level": "District"
            })

    # 2. Municipalities / Cities matches
    for d_name, d_info in AP_DISTRICTS.items():
        for muni in d_info["municipalities"]:
            m_name = muni["name"]
            if q in m_name.lower():
                results.append({
                    "type": "municipality",
                    "display_name": f"{m_name}, {d_name} Dist.",
                    "district": d_name,
                    "municipality": m_name,
                    "muni_type": muni["type"],
                    "wards_count": muni["wards_count"],
                    "has_ward_polygons": muni.get("has_ward_polygons", False),
                    "lat": d_info["lat"],
                    "lon": d_info["lon"],
                    "administrative_level": "Urban Local Body"
                })

    # 3. Mandal matches
    for d_name, d_info in AP_DISTRICTS.items():
        for mandal in d_info["major_mandals"]:
            if q in mandal.lower():
                results.append({
                    "type": "mandal",
                    "display_name": f"{mandal} Mandal, {d_name} Dist.",
                    "district": d_name,
                    "mandal": mandal,
                    "lat": d_info["lat"],
                    "lon": d_info["lon"],
                    "administrative_level": "Revenue Mandal"
                })

    # Return top matches
    return results[:limit]


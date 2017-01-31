#!/usr/bin/python
# -*- coding: latin-1 -*-

import re
import pymongo

client = pymongo.MongoClient("localhost", 27017)
db = client.cnefe
current_street = {
    '_id' : '',
    'city': '',
    'name': ''
}
current_address = {
    'street': '',
    'name': ''
}
current_locality = {
    '_id' : '',
    'city': '',
    'name': ''
}

def place_types(x):
    return {
        '01':'domicílio particular',
        '02':'domicílio coletivo',
        '03':'estabeleciemento agropecuário',
        '04':'estabelecimento de ensino',
        '05':'estabelecimento de saúde',
        '06':'estabeleciemento de outras finalidades',
        '07':'edificação em construção'
    }.get(x,'01')

def degree_to_rad(s):
    print s
    s = s.split(' ')
    degree = float(s[0])
    minutes = float(s[1]) / 60
    seconds = float(s[2]) / 3600
    quadrant = s[3]

    decimal = degree + minutes + seconds
    if quadrant == 'S' or quadrant == 'O':
        decimal = -decimal

    return decimal

def EntryToMongo(entry):
    global current_street
    global last_address
    global current_locality

    #
    # STREET
    #
    if (entry['address'] != current_street['name']):
        # street has changed, upsert
        street = {
            'city': entry['city'],
            'name': entry['address']
        }
        current_street = db.streets.find_one(street)
        if (current_street is None):
            current_street = street
            current_street['_id'] = db.streets.insert_one(street).inserted_id

    #
    # ADDRESS
    #
    address = {
        'street'          : current_street['_id'],
        'number'          : entry['address_number'],
    }
    if entry['address_number'] == '0':
        address['number'] = entry['address_number_mod']

    address['multiple'] = (entry['multiple'] == '2')

    result = db.addresses.find_one(address)
    if (result is None):
        address_id = db.addresses.insert_one(address).inserted_id
    else:
        address_id = result['_id']

    #
    # LOCALITY
    #
    if (entry['locality'] != current_locality['name']):
        locality = {
            'city': entry['city'],
            'name': entry['locality']
        }
        result = db.localities.find_one(locality)
        if (result is None):
            locality_id = db.localities.insert_one(locality).inserted_id
        else:
            locality_id = result['_id']
        current_locality = locality
        current_locality['_id'] = locality_id

    #
    # PLACE
    #
    place = {
        'address': address_id,
        'locality': current_locality['_id'],
        'complement': [],
        'type'                 : place_types(entry['place_type']),
        'zipcode'              : entry['zipcode'],
    }

    if entry['place_name']:
        place['name'] = entry['place_name']

    if (entry['lat'] and entry['lon']):
        place['lat'] = degree_to_rad(entry['lat'])
        place['lon'] = degree_to_rad(entry['lon'])

    if (entry['domicile_name']):
        place['domicile_name'] = entry['domicile_name']

    if (entry['block']):
        place['block'] = entry['block']

    if (entry['block_face']):
        place['block_face'] = entry['block_face']

    # clear empty complements
    for c in entry['complements']:
        if c.__len__() > 0:
            place['complement'].append(c)

    db.places.insert_one(place)


def LineToEntry(line):
    # See Layout_Donwload.xls bundled with CNEFE
    address_type  = line[16 :16  + 20].strip()
    address_title = line[36 :36  + 30].strip()
    address_name  = line[66 :66  + 60].strip()

    address = address_type
    if address_title:
        address += " " + address_title
    address += " " + address_name
    address = re.sub(" +", ' ', address)

    entry = {
        "state"                : line[0  :0   + 2 ],
        "city"                 : line[0  :2   + 5 ].replace(' ', '0'),
        "district"             : line[0  :7   + 2 ].replace(' ', '0'),
        "subdistrict"          : line[0  :9   + 2 ].replace(' ', '0'),
        "sector"               : line[0  :11  + 4 ].replace(' ', '0'),
        "sector_type"          : line[15 :15  + 1 ].strip(),
        "address"              : address,
        "address_number"       : line[126:126 + 8].strip(),
        "address_number_mod"   : line[134:134 + 7].strip(),
        "complements"           : [
            line[141:141 + 20].strip(),
            line[161:161 + 10].strip(),
            line[171:171 + 20].strip(),
            line[191:191 + 10].strip(),
            line[201:201 + 20].strip(),
            line[221:221 + 10].strip(),
            line[231:231 + 20].strip(),
            line[251:251 + 10].strip(),
            line[261:261 + 20].strip(),
            line[282:282 + 10].strip()
        ],
        "lat"                  : line[321:321 + 15].strip(),
        "lon"                  : line[336:336 + 15].strip(),
        "locality"             : line[351:351 + 60].strip(),
        "place_type"           : line[471:471 + 2].strip(),
        "place_name"           : line[473:473 + 40].strip(),
        "multiple"             : line[513:513 + 1].strip(),
        "domicile_name"        : line[514:514 + 30].strip(),
        "block"                : line[545:545 + 3].strip(),
        "block_face"           : line[548:548 + 3].strip(),
        "zipcode"              : line[550:550 + 8 ].strip(),
    }

    return entry

def Main():
    # db.streets.remove()
    # db.localities.remove()
    # db.addresses.remove()
    db.places.remove()

    txt = open('./samples/35011031500.TXT', "r")
    # txt = open('./samples/35001050500.TXT', "r")
    for line in txt:
        line = line.decode('latin-1')
        EntryToMongo(LineToEntry(line))


if __name__ == "__main__":
    Main()

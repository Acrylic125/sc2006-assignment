INSERT INTO "test_poi" (id, name, description, latitude, longitude)
VALUES (
        0,
        'POI 0',
        'Description for POI 0',
        0.0538986705,
        0.0538986705
    ),
    (1, 'POI 1', 'Description for POI 1', 0, 0),
    (
        2,
        'POI 2',
        'Description for POI 2',
        0.0538986705,
        0.0538986705
    ),
    (3, 'POI 3', 'Description for POI 3', 0, 0),
    (
        4,
        'POI 4',
        'Description for POI 4',
        0.0538986705,
        0.0538986705
    ),
    (5, 'POI 5', 'Description for POI 5', 0, 0),
    (
        6,
        'POI 6',
        'Description for POI 6',
        0.0538986705,
        0.0538986705
    ),
    (7, 'POI 7', 'Description for POI 7', 0, 0),
    (
        8,
        'POI 8',
        'Description for POI 8',
        0.0538986705,
        0.0538986705
    ),
    (9, 'POI 9', 'Description for POI 9', 0, 0),
    (
        10,
        'POI 10',
        'Description for POI 10',
        0.0538986705,
        0.0538986705
    ),
    (11, 'POI 11', 'Description for POI 11', 0, 0),
    (12, 'POI 12', 'Description for POI 12', 1, 1),
    (13, 'POI 13', 'Description for POI 13', 1, 1),
    (14, 'POI 14', 'Description for POI 14', 1, 1),
    (15, 'POI 15', 'Description for POI 15', 1, 1),
    (16, 'POI 16', 'Description for POI 16', 1, 1),
    (17, 'POI 17', 'Description for POI 17', 1, 1),
    (18, 'POI 18', 'Description for POI 18', 1, 1),
    (19, 'POI 19', 'Description for POI 19', 1, 1);
INSERT INTO "test_tag" (id, name)
VALUES (0, 'Tag 0'),
    (1, 'Tag 1'),
    (2, 'Tag 2');
INSERT INTO "test_poi_tag" (poi_id, tag_id)
VALUES (0, 0),
    (1, 0),
    (2, 0),
    (3, 0),
    (4, 1),
    (5, 1),
    (6, 1),
    (7, 1),
    (8, 2),
    (9, 2),
    (10, 2),
    (11, 2);
INSERT INTO "test_review" (poi_id, "userId", liked, comment)
VALUES -- POI 12: 3 reviews (3 liked, 0 disliked)
    (
        12,
        'user1_poi12',
        true,
        'Great experience at POI 12!'
    ),
    (
        12,
        'user2_poi12',
        true,
        'Loved POI 12! Highly recommended.'
    ),
    (12, 'user3_poi12', true, 'POI 12 was fantastic.'),
    -- POI 13: 3 reviews (3 liked, 0 disliked)
    (
        13,
        'user1_poi13',
        true,
        'Amazing time at POI 13.'
    ),
    (
        13,
        'user2_poi13',
        true,
        'Definitely enjoyed POI 13.'
    ),
    (13, 'user3_poi13', true, 'Thumbs up for POI 13!'),
    -- POI 14: 3 reviews (3 liked, 0 disliked)
    (
        14,
        'user1_poi14',
        true,
        'POI 14 exceeded expectations.'
    ),
    (
        14,
        'user2_poi14',
        true,
        'Had a wonderful visit to POI 14.'
    ),
    (
        14,
        'user3_poi14',
        true,
        'Positive review for POI 14.'
    ),
    -- POI 15: 3 reviews (2 liked, 1 disliked)
    (15, 'user1_poi15', true, 'Really liked POI 15!'),
    (15, 'user2_poi15', true, 'Good visit to POI 15.'),
    (
        15,
        'user3_poi15',
        false,
        'POI 15 was okay, nothing special.'
    ),
    -- POI 16: 3 reviews (1 liked, 2 disliked)
    (
        16,
        'user1_poi16',
        true,
        'Enjoyed parts of POI 16.'
    ),
    (
        16,
        'user2_poi16',
        false,
        'POI 16 was a bit disappointing.'
    ),
    (16, 'user3_poi16', false, 'Did not like POI 16.'),
    -- POI 17: 2 reviews (2 liked, 0 disliked)
    (
        17,
        'user1_poi17',
        true,
        'Fantastic spot! POI 17 is a must-see.'
    ),
    (
        17,
        'user2_poi17',
        true,
        'POI 17 was delightful.'
    ),
    -- POI 18: 2 reviews (1 liked, 1 disliked)
    (
        18,
        'user1_poi18',
        true,
        'Had a decent time at POI 18.'
    ),
    (
        18,
        'user2_poi18',
        false,
        'POI 18 did not live up to the hype.'
    );
INSERT INTO "test_itinerary" (id, name, "userId")
VALUES (1, 'Test Itinerary 1', 'test-user'),
    (2, 'Test Itinerary 2', 'test-user');
INSERT INTO "test_itinerary_poi" (itinerary_id, poi_id, order_priority, checked)
VALUES (1, 1, 1, true),
    (1, 3, 2, true),
    (2, 5, 1, true),
    (2, 7, 2, false);
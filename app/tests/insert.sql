INSERT INTO "test_poi" (id, name, description, latitude, longitude)
VALUES (0, 'POI 0', 'Description for POI 0', 6, 6),
    (1, 'POI 1', 'Description for POI 1', 0, 0),
    (2, 'POI 2', 'Description for POI 2', 6, 6),
    (3, 'POI 3', 'Description for POI 3', 0, 0),
    (4, 'POI 4', 'Description for POI 4', 6, 6),
    (5, 'POI 5', 'Description for POI 5', 0, 0),
    (6, 'POI 6', 'Description for POI 6', 6, 6),
    (7, 'POI 7', 'Description for POI 7', 0, 0),
    (8, 'POI 8', 'Description for POI 8', 6, 6),
    (9, 'POI 9', 'Description for POI 9', 0, 0),
    (10, 'POI 10', 'Description for POI 10', 6, 6),
    (11, 'POI 11', 'Description for POI 11', 0, 0);
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
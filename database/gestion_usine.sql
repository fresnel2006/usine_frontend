-- =====================================================================
-- Projet Agile des logiciels TWIN_3 - Groupe 7
-- Application web de gestion de l'usine
-- Script de création de la base de données PostgreSQL
-- Auteurs : TRAORE Ange Fresnel, SAMECKEN Audrey Emmanuella
-- =====================================================================

DROP DATABASE IF EXISTS gestion_usine;
CREATE DATABASE gestion_usine ENCODING 'UTF8';
\c gestion_usine

-- ---------------------------------------------------------------------
-- 1. Equipes et operateurs
-- ---------------------------------------------------------------------
CREATE TABLE equipe (
    num_equipe            INTEGER      PRIMARY KEY,
    libelle               VARCHAR(100) NOT NULL,
    matricule_responsable VARCHAR(10)  UNIQUE          -- un seul collaborateur responsable
);

CREATE TABLE operateur (
    matricule   VARCHAR(10)  PRIMARY KEY,
    nom         VARCHAR(60)  NOT NULL,
    prenom      VARCHAR(80)  NOT NULL,
    date_entree DATE         NOT NULL,
    num_equipe  INTEGER      NOT NULL REFERENCES equipe(num_equipe)   -- une seule equipe
);

-- La cle etrangere du responsable est ajoutee apres (references croisees)
ALTER TABLE equipe
    ADD CONSTRAINT fk_equipe_responsable
    FOREIGN KEY (matricule_responsable) REFERENCES operateur(matricule);

-- ---------------------------------------------------------------------
-- 2. Ateliers, lignes de production et machines
-- ---------------------------------------------------------------------
CREATE TABLE atelier (
    num_atelier           INTEGER      PRIMARY KEY,
    libelle               VARCHAR(100) NOT NULL,
    matricule_responsable VARCHAR(10)  NOT NULL UNIQUE REFERENCES operateur(matricule)
);

CREATE TABLE ligne_production (
    num_ligne                 INTEGER PRIMARY KEY,
    nb_operateurs_necessaires INTEGER NOT NULL CHECK (nb_operateurs_necessaires > 0),
    num_atelier               INTEGER NOT NULL REFERENCES atelier(num_atelier)
);

CREATE TABLE machine (
    num_machine INTEGER      PRIMARY KEY,
    designation VARCHAR(100) NOT NULL,
    num_ligne   INTEGER      NOT NULL REFERENCES ligne_production(num_ligne)  -- une seule ligne
);

-- ---------------------------------------------------------------------
-- 3. Produits et lots de production
-- ---------------------------------------------------------------------
CREATE TABLE produit (
    reference           VARCHAR(20)   PRIMARY KEY,
    designation         VARCHAR(100)  NOT NULL,
    prix_vente_unitaire NUMERIC(12,2) NOT NULL CHECK (prix_vente_unitaire >= 0),
    quantite_stock      INTEGER       NOT NULL DEFAULT 0 CHECK (quantite_stock >= 0)
);

CREATE TABLE lot_production (
    num_lot           INTEGER     PRIMARY KEY,
    date_production   DATE        NOT NULL,
    num_ligne         INTEGER     NOT NULL REFERENCES ligne_production(num_ligne),
    reference_produit VARCHAR(20) NOT NULL REFERENCES produit(reference)
);

-- Association « a oeuvre sur » : un lot est realise par un ou plusieurs operateurs
CREATE TABLE participer (
    num_lot   INTEGER     REFERENCES lot_production(num_lot) ON DELETE CASCADE,
    matricule VARCHAR(10) REFERENCES operateur(matricule),
    PRIMARY KEY (num_lot, matricule)
);

-- ---------------------------------------------------------------------
-- 4. Incidents
-- ---------------------------------------------------------------------
CREATE TABLE type_incident (
    code_type VARCHAR(10)  PRIMARY KEY,
    libelle   VARCHAR(100) NOT NULL
);

CREATE TABLE incident (
    num_incident SERIAL      PRIMARY KEY,
    temps_arret  INTEGER     NOT NULL CHECK (temps_arret > 0),          -- en minutes
    num_lot      INTEGER     NOT NULL REFERENCES lot_production(num_lot), -- un et un seul lot
    code_type    VARCHAR(10) NOT NULL REFERENCES type_incident(code_type)
);

-- ---------------------------------------------------------------------
-- 5. Maintenance des machines
-- ---------------------------------------------------------------------
CREATE TABLE maintenance (
    num_maintenance  SERIAL    PRIMARY KEY,
    date_heure_debut TIMESTAMP NOT NULL,
    duree            INTEGER   NOT NULL CHECK (duree > 0),               -- en minutes
    num_machine      INTEGER   NOT NULL REFERENCES machine(num_machine)
);

-- Association « effectue » : une maintenance est faite par un ou plusieurs operateurs
CREATE TABLE effectuer (
    num_maintenance INTEGER     REFERENCES maintenance(num_maintenance) ON DELETE CASCADE,
    matricule       VARCHAR(10) REFERENCES operateur(matricule),
    PRIMARY KEY (num_maintenance, matricule)
);

-- ---------------------------------------------------------------------
-- 6. Pieces, nomenclature et consommation
-- ---------------------------------------------------------------------
CREATE TABLE piece (
    reference        VARCHAR(20)   PRIMARY KEY,
    libelle          VARCHAR(100)  NOT NULL,
    prix_unitaire_ht NUMERIC(12,2) NOT NULL CHECK (prix_unitaire_ht >= 0),
    quantite_stock   INTEGER       NOT NULL DEFAULT 0 CHECK (quantite_stock >= 0)
);

-- Classe d'association Consommation (Maintenance - Piece)
CREATE TABLE consommer (
    num_maintenance INTEGER     REFERENCES maintenance(num_maintenance) ON DELETE CASCADE,
    reference_piece VARCHAR(20) REFERENCES piece(reference),
    quantite        INTEGER     NOT NULL CHECK (quantite > 0),
    PRIMARY KEY (num_maintenance, reference_piece)
);

-- Classe d'association Nomenclature (association reflexive Piece - Piece)
CREATE TABLE nomenclature (
    reference_composee  VARCHAR(20) REFERENCES piece(reference),
    reference_composant VARCHAR(20) REFERENCES piece(reference),
    quantite            INTEGER     NOT NULL CHECK (quantite > 0),
    PRIMARY KEY (reference_composee, reference_composant),
    CHECK (reference_composee <> reference_composant)
);

-- ---------------------------------------------------------------------
-- 7. Fournisseurs et achats
-- ---------------------------------------------------------------------
CREATE TABLE fournisseur (
    code_fournisseur VARCHAR(10)  PRIMARY KEY,
    raison_sociale   VARCHAR(120) NOT NULL,
    adresse          VARCHAR(200),
    telephone        VARCHAR(20)
);

-- Classe d'association Achat (Piece - Fournisseur) : plusieurs prix et dates d'achat
CREATE TABLE achat (
    reference_piece  VARCHAR(20)   REFERENCES piece(reference),
    code_fournisseur VARCHAR(10)   REFERENCES fournisseur(code_fournisseur),
    date_achat       DATE          NOT NULL,
    prix_achat       NUMERIC(12,2) NOT NULL CHECK (prix_achat >= 0),
    quantite         INTEGER       NOT NULL DEFAULT 1 CHECK (quantite > 0),
    PRIMARY KEY (reference_piece, code_fournisseur, date_achat)
);

-- ---------------------------------------------------------------------
-- 8. Comptes utilisateurs (authentification)
-- ---------------------------------------------------------------------
CREATE TABLE utilisateur (
    login        VARCHAR(40)  PRIMARY KEY,
    mot_de_passe VARCHAR(255) NOT NULL,                 -- empreinte (hash), jamais en clair
    role         VARCHAR(30)  NOT NULL CHECK (role IN
                 ('ADMINISTRATEUR', 'RESPONSABLE_ATELIER', 'COLLABORATEUR_RESPONSABLE', 'OPERATEUR')),
    matricule    VARCHAR(10)  REFERENCES operateur(matricule),
    actif        BOOLEAN      NOT NULL DEFAULT TRUE
);

-- =====================================================================
-- JEU DE DONNEES DE TEST
-- Usine fictive : Akwaba Agro-Industrie, zone industrielle de Yopougon (Abidjan)
-- =====================================================================

INSERT INTO equipe (num_equipe, libelle) VALUES
    (1, 'Équipe du matin'),
    (2, 'Équipe de l''après-midi'),
    (3, 'Équipe maintenance');

INSERT INTO operateur (matricule, nom, prenom, date_entree, num_equipe) VALUES
    ('OP001', 'KOUASSI',  'Yao Serge',        '2019-03-04', 1),
    ('OP002', 'BAMBA',    'Mariam',           '2020-06-15', 1),
    ('OP003', 'KONAN',    'Aya Estelle',      '2021-01-11', 2),
    ('OP004', 'DIABATE',  'Moussa',           '2018-09-03', 2),
    ('OP005', 'N''GUESSAN','Koffi Hermann',   '2022-02-21', 3),
    ('OP006', 'OUATTARA', 'Salimata',         '2017-11-06', 3),
    ('OP007', 'GBAGBO',   'Ahou Prisca',      '2023-05-02', 1),
    ('OP008', 'TOURE',    'Ibrahim',          '2016-04-18', 2);

UPDATE equipe SET matricule_responsable = 'OP002' WHERE num_equipe = 1;
UPDATE equipe SET matricule_responsable = 'OP004' WHERE num_equipe = 2;
UPDATE equipe SET matricule_responsable = 'OP006' WHERE num_equipe = 3;

INSERT INTO atelier (num_atelier, libelle, matricule_responsable) VALUES
    (10, 'Atelier transformation',  'OP008'),
    (20, 'Atelier embouteillage',   'OP001'),
    (30, 'Atelier conditionnement', 'OP003');

INSERT INTO ligne_production (num_ligne, nb_operateurs_necessaires, num_atelier) VALUES
    (101, 4, 10),
    (102, 3, 10),
    (201, 5, 20),
    (301, 2, 30);

INSERT INTO machine (num_machine, designation, num_ligne) VALUES
    (1, 'Broyeuse à manioc',           101),
    (2, 'Presse à huile',              102),
    (3, 'Remplisseuse de bouteilles',  201),
    (4, 'Capsuleuse automatique',      201),
    (5, 'Ensacheuse',                  301);

INSERT INTO produit (reference, designation, prix_vente_unitaire, quantite_stock) VALUES
    ('PRD-ATT1K', 'Attiéké déshydraté 1 kg',  1500.00, 1200),
    ('PRD-HPR1L', 'Huile de palme rouge 1 L', 1300.00,  800),
    ('PRD-BIS1L', 'Jus de bissap 1 L',         800.00, 2500),
    ('PRD-GNG50', 'Jus de gingembre 50 cl',    500.00, 1800);

INSERT INTO lot_production (num_lot, date_production, num_ligne, reference_produit) VALUES
    (5001, '2026-10-19', 101, 'PRD-ATT1K'),
    (5002, '2026-10-19', 201, 'PRD-BIS1L'),
    (5003, '2026-10-20', 102, 'PRD-HPR1L'),
    (5004, '2026-10-21', 201, 'PRD-GNG50'),
    (5005, '2026-10-22', 301, 'PRD-ATT1K');

INSERT INTO participer (num_lot, matricule) VALUES
    (5001, 'OP001'), (5001, 'OP002'),
    (5002, 'OP003'), (5002, 'OP007'),
    (5003, 'OP004'),
    (5004, 'OP003'), (5004, 'OP008'),
    (5005, 'OP002');

INSERT INTO type_incident (code_type, libelle) VALUES
    ('PAN', 'Panne machine'),
    ('COU', 'Coupure de courant'),
    ('MAT', 'Rupture de matière première'),
    ('QUA', 'Défaut de qualité');

INSERT INTO incident (temps_arret, num_lot, code_type) VALUES
    (45,  5001, 'PAN'),
    (90,  5002, 'COU'),
    (30,  5003, 'MAT'),
    (20,  5004, 'QUA'),
    (120, 5002, 'PAN');

INSERT INTO piece (reference, libelle, prix_unitaire_ht, quantite_stock) VALUES
    ('PCE-COUR', 'Courroie de transmission',   12500.00, 15),
    ('PCE-ROUL', 'Roulement à billes 6204',     3500.00, 40),
    ('PCE-JOIN', 'Joint d''étanchéité',          800.00, 120),
    ('PCE-MOTR', 'Moteur électrique 2,2 kW',  185000.00, 3),
    ('PCE-ARBR', 'Arbre de transmission',      45000.00, 6),
    ('PCE-KITP', 'Kit pompe de remplissage',   95000.00, 2);

-- Nomenclature : une piece composee d'autres pieces
INSERT INTO nomenclature (reference_composee, reference_composant, quantite) VALUES
    ('PCE-MOTR', 'PCE-ROUL', 2),
    ('PCE-MOTR', 'PCE-ARBR', 1),
    ('PCE-KITP', 'PCE-JOIN', 4),
    ('PCE-KITP', 'PCE-ROUL', 1);

INSERT INTO maintenance (date_heure_debut, duree, num_machine) VALUES
    ('2026-10-19 14:00', 60,  1),
    ('2026-10-20 08:30', 120, 3),
    ('2026-10-22 10:00', 45,  4);

INSERT INTO effectuer (num_maintenance, matricule) VALUES
    (1, 'OP005'), (1, 'OP006'),
    (2, 'OP005'),
    (3, 'OP006');

-- La 3e maintenance n'a consomme aucune piece (relation optionnelle : «extend»)
INSERT INTO consommer (num_maintenance, reference_piece, quantite) VALUES
    (1, 'PCE-COUR', 1),
    (1, 'PCE-ROUL', 2),
    (2, 'PCE-JOIN', 6);

INSERT INTO fournisseur (code_fournisseur, raison_sociale, adresse, telephone) VALUES
    ('F001', 'Ivoire Pièces Industrielles', 'Zone industrielle de Vridi, Abidjan',     '+225 27 21 00 11 22'),
    ('F002', 'Sahel Mécanique SARL',        'Boulevard de Marseille, Treichville',     '+225 27 21 33 44 55'),
    ('F003', 'Lagune Électro Services',     'Rue des Jardins, Cocody Deux-Plateaux',  '+225 27 22 66 77 88');

INSERT INTO achat (reference_piece, code_fournisseur, date_achat, prix_achat, quantite) VALUES
    ('PCE-COUR', 'F001', '2026-09-10', 11800.00, 10),
    ('PCE-COUR', 'F002', '2026-10-05', 12200.00,  5),
    ('PCE-ROUL', 'F001', '2026-09-10',  3200.00, 40),
    ('PCE-JOIN', 'F002', '2026-09-28',   700.00, 100),
    ('PCE-MOTR', 'F003', '2026-08-14', 178000.00, 2),
    ('PCE-MOTR', 'F003', '2026-10-12', 182000.00, 1);

INSERT INTO utilisateur (login, mot_de_passe, role, matricule) VALUES
    ('admin',     '$2b$12$exempleEmpreinteAdmin.................', 'ADMINISTRATEUR',            NULL),
    ('itoure',    '$2b$12$exempleEmpreinteIToure................', 'RESPONSABLE_ATELIER',       'OP008'),
    ('mbamba',    '$2b$12$exempleEmpreinteMBamba................', 'COLLABORATEUR_RESPONSABLE', 'OP002'),
    ('knguessan', '$2b$12$exempleEmpreinteKNguessan.............', 'OPERATEUR',                 'OP005');

-- =====================================================================
-- REQUETES DE VERIFICATION
-- =====================================================================

-- R1. Total des temps d'arret par atelier
SELECT a.libelle AS atelier, SUM(i.temps_arret) AS total_arret_minutes
FROM incident i
JOIN lot_production lp ON lp.num_lot = i.num_lot
JOIN ligne_production l ON l.num_ligne = lp.num_ligne
JOIN atelier a ON a.num_atelier = l.num_atelier
GROUP BY a.libelle
ORDER BY total_arret_minutes DESC;

-- R2. Operateurs de chaque equipe avec leur responsable
SELECT e.libelle AS equipe, o.nom || ' ' || o.prenom AS operateur,
       r.nom || ' ' || r.prenom AS responsable
FROM operateur o
JOIN equipe e ON e.num_equipe = o.num_equipe
LEFT JOIN operateur r ON r.matricule = e.matricule_responsable
ORDER BY e.num_equipe, o.nom;

-- R3. Pieces consommees par maintenance
SELECT m.num_maintenance, ma.designation AS machine, p.libelle AS piece, c.quantite
FROM consommer c
JOIN maintenance m ON m.num_maintenance = c.num_maintenance
JOIN machine ma ON ma.num_machine = m.num_machine
JOIN piece p ON p.reference = c.reference_piece
ORDER BY m.num_maintenance;

-- R4. Nomenclature : composants de chaque piece composee
SELECT pc.libelle AS piece_composee, pk.libelle AS composant, n.quantite
FROM nomenclature n
JOIN piece pc ON pc.reference = n.reference_composee
JOIN piece pk ON pk.reference = n.reference_composant
ORDER BY pc.libelle;

-- R5. Historique des prix d'achat par piece et par fournisseur
SELECT p.libelle AS piece, f.raison_sociale AS fournisseur, a.date_achat, a.prix_achat
FROM achat a
JOIN piece p ON p.reference = a.reference_piece
JOIN fournisseur f ON f.code_fournisseur = a.code_fournisseur
ORDER BY p.libelle, a.date_achat;

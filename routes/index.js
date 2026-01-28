var express = require('express');
var router = express.Router();

var Voyage = require('../models/voyages');

const moment = require("moment-timezone");
const tz = "Europe/Paris";

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET /voyages : les données de voyage à partir de departure et arrival*/

router.get("/voyages", async (req, res) => {
  try {
    const { departure, arrival, date } = req.query;

    // Validation champs renseignés
    if (!departure || !arrival || !date) {
      return res.status(400).json({
        message: "Remplissez Departure, Arrival et Date !",
      });
    }

    // Villes propres
    const departureClean = departure.trim();
    const arrivalClean = arrival.trim();

    //Si pas d'heure c'est minuit sinon c'est l'heure précisée
    const searchMomentTZ = moment.tz(date, tz);
    if (!searchMomentTZ.isValid()) {
      return res.status(400).json({ message: "Date invalide" });
    }

    // Définir la plage horaire
    const dayStartTZ = searchMomentTZ.clone().startOf("day");
    const dayEndTZ = searchMomentTZ.clone().endOf("day");

    //Si c'est aujourd'hui, on enlève les voyages antérieures à l'heure de la recherche

    const nowTZ = moment.tz(tz);
    const isTodayTZ = nowTZ.isSame(dayStartTZ, "day");

    const effectiveStartTZ = isTodayTZ ? nowTZ : dayStartTZ;
    //Renvoyer les données demandées en fonction du jour choisi
    const voyages = await Voyage.find(
      {
        departure: new RegExp(`^${departureClean}$`, "i"),
        arrival: new RegExp(`^${arrivalClean}$`, "i"),
        date: {
          $gte: effectiveStartTZ.toDate(),
          $lte: dayEndTZ.toDate(),
        },
      },
      //Projection Mongo: inclure uniquement ces champs 
      { departure: 1, arrival: 1, date: 1, price: 1, isCarted: 1, isBooked: 1, _id: 1 }
    ).sort({ date: 1 });

    // Si les voyages n'existent pas
    if (voyages.length === 0) {
      return res.status(200).json({
        message: "Aucun voyage trouvé!"
      });
    }
    const formatted = voyages.map((v) => ({
      departure: v.departure,
      arrival: v.arrival,
      hour: moment(v.date).tz(tz).format("HH:mm"),
      price: v.price,
      isCarted: v.isCarted,
      isBooked: v.isBooked,
      _id: v._id
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
});

//POST pour modifier la propriété isCarted vers true 

router.post("/voyages/addtocart", async (req, res) => {
  try {
    const { voyageId } = req.body;

    if (!voyageId) {
      return res.status(400).json({ message: "voyageId requis" });
    }

    // Met à jour isCarted
    const updatedVoyage = await Voyage.findOneAndUpdate(
      { _id: voyageId },
      { $set: { isCarted: true } },
      { new: true }
    );

    if (!updatedVoyage) {
      return res.status(404).json({ message: "Voyage introuvable" });
    }

    // Réponse = uniquement departure/arrival/hour/price
    return res.status(200).json({
      departure: updatedVoyage.departure,
      arrival: updatedVoyage.arrival,
      hour: moment(updatedVoyage.date).tz(tz).format("HH:mm"),
      price: updatedVoyage.price,
      isCarted: updatedVoyage.isCarted
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
});

//POST pour envoyer les voyages du cart vers la partie book

router.post("/voyages/addtobook", async (req, res) => {
  
  try {
    const { voyageId } = req.body;

    if (!voyageId) {
      return res.status(400).json({ message: "voyageId requis" });
    }

    // Met à jour isBooked
    const updatedVoyage = await Voyage.findOneAndUpdate(
      { _id: voyageId },
      { $set: { isBooked: true, isCarted: false } },
      { new: true }
    );

    if (!updatedVoyage) {
      return res.status(404).json({ message: "Voyage introuvable" });
    }

    // Réponse = uniquement departure/arrival/hour/price
    return res.status(200).json({
      departure: updatedVoyage.departure,
      arrival: updatedVoyage.arrival,
      hour: moment(updatedVoyage.date).tz(tz).format("HH:mm"),
      price: updatedVoyage.price,
      isCarted: updatedVoyage.isCarted,
      isBooked: updatedVoyage.isBooked
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
});

//POST pour supprimer un élément en mettant à jour le isCarted à false quand il était true

router.post("/voyages/deletefromcart", async (req, res) => {
  try {
    const { voyageId } = req.body;

    if (!voyageId) {
      return res.status(400).json({ message: "voyageId requis" });
    }

    // Met à jour isCarted
    const updatedVoyage = await Voyage.findOneAndUpdate(
      { _id: voyageId },
      { $set: { isCarted: false } },
      { new: true }
    );

    if (!updatedVoyage) {
      return res.status(404).json({ message: "Voyage introuvable" });
    }

    // Réponse = uniquement departure/arrival/hour/price
    return res.status(200).json({
      departure: updatedVoyage.departure,
      arrival: updatedVoyage.arrival,
      hour: moment(updatedVoyage.date).tz(tz).format("HH:mm"),
      price: updatedVoyage.price,
      isCarted: updatedVoyage.isCarted
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
});

/*GET tous les voyages de la BDD pour isCartedistrue*/

router.get("/voyages/allisCartedisTrue", async (req, res) => {
  try {
    const voyages = await Voyage.find(
      { isCarted: true },
      { departure: 1, arrival: 1, date: 1, price: 1, isCarted: 1, isBooked: 1, _id: 1 }
    );
    return res.status(200).json(
      voyages.map(v => ({
        departure: v.departure,
        arrival: v.arrival,
        hour: moment(v.date).tz(tz).format("HH:mm"),
        price: v.price,
        isCarted: v.isCarted,
        _id: v._id
      }))
    );
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
});

/*GET tous les voyages de la BDD pour isBookedistrue*/

router.get("/voyages/allisBookedisTrue", async (req, res) => {
  try {
    const voyages = await Voyage.find(
      { isBooked: true },
      { departure: 1, arrival: 1, date: 1, price: 1, isCarted: 1, isBooked: 1, _id: 1 }
    );
    return res.status(200).json(
      voyages.map(v => {

        const now = moment.tz(tz);
        const departureDate = moment(v.date).tz(tz);

        const duration = moment.duration(departureDate.diff(now));

        return {
          departure: v.departure,
          arrival: v.arrival,
          hour: moment(v.date).tz(tz).format("HH:mm"),
          price: v.price,
          isCarted: v.isCarted,
          isBooked: v.isBooked,
          _id: v._id,
          timeRemaining: {
            days: duration.days(),
            hours: duration.hours(),
            minutes: duration.minutes()
          }
        };
      })
    );
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
});

/*POST Changer le isBooked true vers false*/

router.post("/voyages/deletefrombook", async (req, res) => {
  try {

    // Met à jour isBooked
    const result = await Voyage.updateMany(
      { isBooked : true },
      { $set: { isBooked: false } },
    );

    // Réponse voyage annulés
    return res.status(200).json({
      message: "Voyages annulés!",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
});

/*GET Récupérer toute la BDD*/

router.get("/voyagesAll", async (req, res) => {
  const voyages = await Voyage.find()
  return res.status(200).json(voyages);
})

module.exports = router;

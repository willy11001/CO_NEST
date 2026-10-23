const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', propertyController.getListings);
router.get('/:id', propertyController.getListingById);

router.post('/', authMiddleware, roleMiddleware(['agent', 'admin']), propertyController.publishListing);
router.put('/:id', authMiddleware, roleMiddleware(['agent', 'admin']), propertyController.updateListing);
router.delete('/:id', authMiddleware, propertyController.deleteListing);
router.post('/:id/reviews', authMiddleware, propertyController.submitReview);
router.post('/:id/citi-ratings', authMiddleware, propertyController.submitCitiRating);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, deleteVariant } = require('../controllers/product');

/* GET product list */
router.get('/', async function(req, res, next) {
  try {
    res.json(await getProducts(req.query.page));
  } catch (err) {
    next(err);
  }
});

/* GET product by ID */
router.get('/:id', async function(req, res, next) {
  try {
    res.json(await getProductById(req.params.id));
  } catch (err) {
    next(err);
  }
});

/* POST product */
router.post('/', async function(req, res, next) {
  try {
    res.json(await createProduct(req.body));
  } catch (err) {
    next(err);
  }
});

/* UPDATE product */
router.put('/:id', async function(req, res, next) {
  try {
    res.json(await updateProduct(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

/* DELETE product BY ID */
router.delete('/:id', async function(req, res, next) {
  try {
    data = await deleteProduct(req.params.id);
    console.log(data);
    res.json(data);
    // res.send(await deleteProduct(req.params.id));
  } catch (err) {
    next(err);
  }
});

/* DELETE variant BY ID */
router.delete('/variant/:id', async function(req, res, next) {
  try {
    res.send(await deleteVariant(req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;

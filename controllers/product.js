const promise = require('bluebird');
const initOptions = {
    promiseLib: promise // overriding the default (ES6 Promise);
};
const pgp = require('pg-promise')(initOptions);
const config = require('../config');
const db = pgp(config.db);

async function getProducts(page = 1) {
    const offset = (page - 1) * [config.rowsPerPage];
    return db.task(async t => {
        const data = await t.any("SELECT id, prod_name, prod_desc, prod_image_url, " +
        "prod_price, (SELECT array_to_json(array_agg(row_to_json(t))) " +
        "FROM (SELECT id, variant_name, variant_color, variant_price " +
        "FROM variant WHERE product_id=product.id) t) AS variants FROM product OFFSET $1 LIMIT $2", [offset, config.rowsPerPage]);
        const meta = {page};
        return {
            data,
            meta
        }
    });
}

async function getProductById(id) {
    return db.task(async t => {
        const data = await t.one("SELECT id, prod_name, prod_desc, prod_image_url, " +
        "prod_price, (SELECT array_to_json(array_agg(row_to_json(t))) " +
        "FROM (SELECT id, variant_name, variant_color, variant_price " +
        "FROM variant WHERE product_id=product.id) t) AS variants FROM product WHERE id = $1", [id]);
        return {
            data
        }
    });
}

async function createProduct(body) {
    return db.tx(async t => {
        const prod = await t.one("INSERT INTO product(prod_name, prod_desc, prod_image_url, prod_price) " +
        "VALUES($1, $2, $3, $4) RETURNING id", [body.prod_name, body.prod_desc, body.prod_image_url, body.prod_price]);
        body.variants.map(v => {
            return db.tx(async t2 => {
                await t2.one("INSERT INTO variant(variant_name, variant_color, variant_price, product_id) " +
                "VALUES($1, $2, $3, $4) RETURNING id", [v.variant_name, v.variant_color, v.variant_price, prod.id]);
            });
        });
        return {
            prod
        }
    });
}

async function updateProduct(id, body) {
    return db.task(async t => {
        const data = await t.one("UPDATE product SET prod_name=$1, prod_desc=$2, prod_image_url=$3, " +
        "prod_price=$4 WHERE id=$5 RETURNING id", [body.prod_name, body.prod_desc, body.prod_image_url, body.prod_price, id]);
        const varIds = body.variants.map(v => parseInt(v.id) | null);
        const varToRemove = await t.any("SELECT id FROM variant WHERE product_id = $1 AND id <> ALL($2)", [data["id"], varIds]);
        console.log(varToRemove.map(vtr => parseInt(vtr.id)));
        const deleted = await t.any("DELETE FROM variant WHERE id = ANY($1)", [varToRemove.map(vtr => parseInt(vtr.id))]);
        body.variants.map(v => {
            return db.tx(async t2 => {
                if(v.id) {
                    await t2.one("UPDATE variant SET variant_name=$1, variant_color=$2, variant_price=$3 WHERE id=$4 RETURNING id", [v.variant_name, v.variant_color, v.variant_price, v.id]);
                } else {
                    await t2.one("INSERT INTO variant(variant_name, variant_color, variant_price, product_id) " +
                    "VALUES($1, $2, $3, $4) RETURNING id", [v.variant_name, v.variant_color, v.variant_price, id]);
                }
            });
        });
        return {
            data
        }
    });
}

async function deleteProduct(id) {
    return db.task(async t => {
        const data = await t.one("DELETE FROM variant WHERE product_id = $1; " +
        "DELETE FROM product WHERE id = $1 RETURNING *;", [id]).catch(() => {
            const error = new Error("Product not found");
            error.status = 404;
            throw error;
        });
        return {
            data
        }
    });
}

async function deleteVariant(id) {
    return db.task(async t => {
        const data = await t.one("DELETE FROM variant WHERE id = $1 RETURNING *", [id]).catch(() => {
            const error = new Error("Variant not found");
            error.status = 404;
            throw error;
        });
        return {
            data
        }
    });
}

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    deleteVariant
}
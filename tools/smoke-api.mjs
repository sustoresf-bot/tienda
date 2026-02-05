function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(key, value) {
      this.headers[String(key).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
  return res;
}

function createReq({ method = 'GET', headers = {}, body } = {}) {
  return { method, headers, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${err?.message || err}`);
    process.exitCode = 1;
  }
}

const { default: checkoutHandler } = await import('../api/checkout.js');
const { default: paymentHandler } = await import('../api/payment.js');
const { default: deleteUserHandler } = await import('../api/admin/delete-user.js');
const { default: updateUserHandler } = await import('../api/admin/update-user.js');

await runTest('checkout returns 405 on GET', async () => {
  const req = createReq({ method: 'GET' });
  const res = createRes();
  await checkoutHandler(req, res);
  assert(res.statusCode === 405, `expected 405, got ${res.statusCode}`);
});

await runTest('checkout returns 500 when MP token missing', async () => {
  delete process.env.MP_ACCESS_TOKEN;
  const req = createReq({
    method: 'POST',
    headers: {},
    body: { action: 'process_payment', paymentData: { transaction_amount: 100 }, payer: { email: 'a@b.com' } }
  });
  const res = createRes();
  await checkoutHandler(req, res);
  assert(res.statusCode === 500, `expected 500, got ${res.statusCode}`);
});

await runTest('payment returns 400 when customer email missing', async () => {
  const req = createReq({
    method: 'POST',
    body: { orderId: 'x', customer: { name: 'Test' }, items: [], total: 0, subtotal: 0 }
  });
  const res = createRes();
  await paymentHandler(req, res);
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

await runTest('admin delete-user returns 401 without bearer token', async () => {
  const req = createReq({ method: 'POST', body: { uid: 'abc' }, headers: {} });
  const res = createRes();
  await deleteUserHandler(req, res);
  assert(res.statusCode === 401, `expected 401, got ${res.statusCode}`);
});

await runTest('admin update-user returns 401 without bearer token', async () => {
  const req = createReq({ method: 'POST', body: { uid: 'abc' }, headers: {} });
  const res = createRes();
  await updateUserHandler(req, res);
  assert(res.statusCode === 401, `expected 401, got ${res.statusCode}`);
});

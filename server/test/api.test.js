const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const jwt = require('jsonwebtoken')

process.env.CLIENT_ORIGIN = 'http://localhost:5173'
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-jwt-signing'
const app = require('../src/app')

test('health endpoint responds without exposing configuration', async () => {
  const response = await request(app).get('/api/health').expect(200)
  assert.equal(response.body.status, 'ok')
  assert.equal(response.body.database, 'disconnected')
  assert.equal(Object.hasOwn(response.body, 'secret'), false)
})

test('admin mutations reject missing authentication', async () => {
  await request(app).post('/api/dishes').send({ name: 'Test dish' }).expect(401)
  await request(app).patch('/api/settings').send({ name: 'Changed' }).expect(401)
  await request(app).get('/api/reservations').expect(401)
  await request(app).get('/api/staff').expect(401)
})

test('manager credentials cannot access administrator-only operations', async () => {
  const token = jwt.sign({ role: 'manager' }, process.env.JWT_SECRET, {
    subject: 'manager-id',
    issuer: 'haden-restaurantos',
    audience: 'restaurant-admin',
    expiresIn: '8h',
  })
  await request(app).post('/api/dishes').set('Authorization', `Bearer ${token}`).send({}).expect(403)
  await request(app).patch('/api/settings').set('Authorization', `Bearer ${token}`).send({ name: 'Changed' }).expect(403)
  await request(app).get('/api/staff').set('Authorization', `Bearer ${token}`).expect(403)
})

test('reservation booking lookup validates the private reference and phone fields', async () => {
  const response = await request(app).post('/api/reservations/lookup').send({}).expect(400)
  assert.equal(response.body.message, 'Please check the submitted fields.')
})

test('reservation endpoint validates before attempting database writes', async () => {
  const response = await request(app).post('/api/reservations').send({ name: 'A' }).expect(400)
  assert.equal(response.body.message, 'Please check the submitted fields.')
  await request(app).post('/api/reservations').send({
    name: 'Test guest',
    phone: '+923001234567',
    date: '2099-01-01',
    time: 'later sometime',
    guests: 2,
  }).expect(400)
})

test('API rejects an unapproved browser origin', async () => {
  await request(app).get('/api/health').set('Origin', 'https://untrusted.example').expect(403)
})

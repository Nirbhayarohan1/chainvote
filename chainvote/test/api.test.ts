// Run with: npm run test:api   (node:test via tsx). Covers auth/session logic; no MongoDB or chain required.
import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { signToken, verifyToken, requireRole, getSession, MOCK_OTP } from "../lib/server/auth";

const req = (token?: string) => new Request("http://x/api", { headers: token ? { authorization: `Bearer ${token}` } : {} });

test("valid token round-trips", () => { assert.deepEqual({ role: "voter", sub: "VTR-1" }, (({ role, sub }) => ({ role, sub }))(verifyToken(signToken({ role: "voter", sub: "VTR-1" }))!)); });
test("tampered token is rejected", () => { const t = signToken({ role: "voter", sub: "VTR-1" }); assert.equal(verifyToken(t.slice(0, -2) + "xx"), null); });
test("token signed with another secret is rejected", () => { assert.equal(verifyToken(jwt.sign({ role: "admin", sub: "a" }, "wrong")), null); });
test("expired token is rejected", () => { assert.equal(verifyToken(jwt.sign({ role: "admin", sub: "a" }, process.env.JWT_SECRET || "dev-insecure-secret", { expiresIn: -10 })), null); });
test("missing token -> 401", async () => { const r: any = requireRole(req(), "admin"); assert.equal(r.status, 401); });
test("voter token on admin route -> 403", async () => { const r: any = requireRole(req(signToken({ role: "voter", sub: "V" })), "admin"); assert.equal(r.status, 403); });
test("admin token on admin route -> session", () => { const r: any = requireRole(req(signToken({ role: "admin", sub: "admin" })), "admin"); assert.equal(r.role, "admin"); });
test("getSession reads bearer token", () => { assert.equal(getSession(req(signToken({ role: "voter", sub: "V9" })))?.sub, "V9"); });
test("mock OTP defaults to 123456", () => { delete process.env.MOCK_OTP; assert.equal(MOCK_OTP(), "123456"); });

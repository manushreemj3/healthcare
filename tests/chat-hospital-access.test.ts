import { describe, expect, it } from "vitest";
import { AuthService } from "../server/modules/auth/auth.service";

describe("chat hospital access", () => {
  it("allows same-hospital doctors to chat with each other", async () => {
    const authService = new AuthService(undefined, { sign: async () => "token" } as any);
    const hospitalId = 7;

    (authService as any).localUsers.set("u-1", { id: 1, openId: "u-1", name: "Dr. A", role: "DOCTOR", hospitalId, email: null, phone: null, passwordHash: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: "local" });
    (authService as any).localUsers.set("u-2", { id: 2, openId: "u-2", name: "Dr. B", role: "DOCTOR", hospitalId, email: null, phone: null, passwordHash: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: "local" });
    (authService as any).localUsers.set("u-3", { id: 3, openId: "u-3", name: "Nurse C", role: "ASHA_WORKER", hospitalId, email: null, phone: null, passwordHash: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: "local" });
    (authService as any).localUsers.set("u-4", { id: 4, openId: "u-4", name: "Other Hospital", role: "DOCTOR", hospitalId: 9, email: null, phone: null, passwordHash: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: "local" });

    const contacts = await authService.getChatContacts({ id: 1, hospitalId, role: "DOCTOR" } as any);

    expect(contacts.map((contact) => contact.id)).toEqual([2, 3]);
    expect(contacts.some((contact) => contact.id === 4)).toBe(false);
  });
});

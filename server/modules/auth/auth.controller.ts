import { Controller, Post, Body, Get, UseGuards, Request, Logger, UnauthorizedException, Query } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("api/auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(
    @Body()
    body: {
      openId: string;
      name?: string;
      password?: string;
      role?: string;
      hospitalId?: number;
      email?: string;
      phone?: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Post("login")
  async login(@Body() body: { identifier?: string; phone?: string; openId?: string; password?: string }) {
    const identifier = body.identifier ?? body.phone ?? body.openId;
    if (!identifier?.trim()) {
      throw new UnauthorizedException("Phone number or login identifier is required");
    }
    return this.authService.login(identifier, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout() {
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("chat-token")
  async chatToken(@Request() req: any) {
    return { accessToken: await this.authService.createSupabaseChatToken(req.user) };
  }

  @UseGuards(JwtAuthGuard)
  @Get("chat-contacts")
  async chatContacts(@Request() req: any, @Query("facilityId") facilityId?: string) {
    const numericFacilityId = facilityId ? parseInt(facilityId, 10) : undefined;
    return {
      userId: req.user.id,
      contacts: await this.authService.getChatContacts(
        req.user,
        numericFacilityId && !isNaN(numericFacilityId) ? numericFacilityId : undefined,
      ),
    };
  }
}

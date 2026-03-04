import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Forward progressive backoff data from TRPCError cause to the client.
    // The cause object is server-side only by default; we surface it here
    // so the frontend can render countdown timers and CAPTCHA prompts.
    const cause = error.cause as
      | { cooldownRemainingMs?: number; captchaRequired?: boolean; failureCount?: number }
      | undefined;
    return {
      ...shape,
      data: {
        ...shape.data,
        backoff: cause?.cooldownRemainingMs !== undefined
          ? {
              cooldownRemainingMs: cause.cooldownRemainingMs,
              captchaRequired: cause.captchaRequired ?? false,
              failureCount: cause.failureCount ?? 0,
            }
          : undefined,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260925153945 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "subscription" ("id" text not null, "customer_id" text not null, "email" text not null, "product_id" text not null, "variant_id" text not null, "product_title" text not null, "line_title" text null, "quantity" integer not null default 1, "interval_weeks" integer not null default 6, "status" text check ("status" in ('active', 'paused', 'payment_failed', 'cancelled')) not null default 'active', "next_charge_at" timestamptz not null, "last_charged_at" timestamptz null, "origin_order_id" text null, "last_order_id" text null, "stripe_customer_id" text null, "stripe_payment_method_id" text null, "shipping_address" jsonb not null, "failure_count" integer not null default 0, "last_failure_reason" text null, "cancelled_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "subscription_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_customer_id" ON "subscription" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_next_charge_at" ON "subscription" ("next_charge_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_deleted_at" ON "subscription" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "subscription" cascade;`);
  }

}

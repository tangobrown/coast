import type { ExecArgs } from "@medusajs/framework/types"
import renewSubscriptionsJob from "../jobs/renew-subscriptions"

/** Runs the renewal job now instead of waiting for the hourly schedule. */
export default async function run({ container }: ExecArgs) {
  await renewSubscriptionsJob(container)
}

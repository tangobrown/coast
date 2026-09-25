import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import PostmarkNotificationService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [PostmarkNotificationService],
})

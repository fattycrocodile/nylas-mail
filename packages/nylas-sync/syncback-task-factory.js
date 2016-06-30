/**
 * Given a `SyncbackRequestObject` it creates the appropriate syncback task.
 *
 */
class SyncbackTaskFactory {
  static create(account, syncbackRequest) {
    let Task = null;
    switch (syncbackRequest.type) {
      case "MoveToFolder":
        Task = require('./syncback_tasks/move-to-folder.imap'); break;
      case "MarkThreadAsRead":
        Task = require('./syncback_tasks/mark-thread-as-read.imap'); break;
      case "MarkThreadAsUnread":
        Task = require('./syncback_tasks/mark-thread-as-unread.imap'); break;
      default:
        throw new Error(`Invalid Task Type: ${syncbackRequest.type}`)
    }
    return new Task(account, syncbackRequest)
  }
}

module.exports = SyncbackTaskFactory

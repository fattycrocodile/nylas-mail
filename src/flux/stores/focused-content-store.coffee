_ = require 'underscore-plus'
Reflux = require 'reflux'
NamespaceStore = require './namespace-store'
WorkspaceStore = require './workspace-store'
Actions = require '../actions'
Thread = require '../models/thread'
AddRemoveTagsTask = require '../tasks/add-remove-tags'

###
Public: The FocusedContentStore provides access to the objects currently selected
or otherwise focused in the window. Normally, focus would be maintained internally
by components that show models. The FocusedContentStore makes the concept of
selection public so that you can observe focus changes and trigger your own changes
to focus.

Since {FocusedContentStore} is a Flux-compatible Store, you do not call setters
on it directly. Instead, use {Actions::focusInCollection} or
{Actions::focusKeyboardInCollection} to set focus. The FocusedContentStore observes
these models, changes it's state, and broadcasts to it's observers.

Note: The {FocusedContentStore} triggers when a focused model is changed, even if
it's ID has not. For example, if the user has a {Thread} selected and removes a tag,
{FocusedContentStore} will trigger so you can fetch the new version of the
{Thread}. If you observe the {FocusedContentStore} properly, you should always
have the latest version of the the selected object.

**Standard Collections**:

   - thread
   - file
   
**Example: Observing the Selected Thread**

```coffeescript
@unsubscribe = FocusedContentStore.listen(@_onFocusChanged, @)

...

# Called when focus has changed, or when the focused model has been modified.
_onFocusChanged: ->
  thread = FocusedContentStore.focused('thread')
  if thread
    console.log("#{thread.subject} is selected!")
  else
    console.log("No thread is selected!")
```

Section: Stores
###
class FocusedContentStore

  init: ->
    @_resetInstanceVars()
    @listenTo NamespaceStore, @_onClear
    @listenTo WorkspaceStore, @_onWorkspaceChange
    @listenTo Actions.focusInCollection, @_onFocus
    @listenTo Actions.focusKeyboardInCollection, @_onFocusKeyboard

  _resetInstanceVars: =>
    @_focused = {}
    @_keyboardCursor = {}
    @_keyboardCursorEnabled = WorkspaceStore.layoutMode() is 'list'

  # Inbound Events

  _onClear: =>
    @_focused = {}
    @_keyboardCursor = {}
    @trigger({ impactsCollection: -> true })

  _onFocusKeyboard: ({collection, item}) =>
    throw new Error("focusKeyboard() requires a collection") unless collection
    return if @_keyboardCursor[collection]?.id is item?.id

    @_keyboardCursor[collection] = item
    @trigger({ impactsCollection: (c) -> c is collection })

  _onFocus: ({collection, item}) =>
    throw new Error("focus() requires a collection") unless collection
    return if @_focused[collection]?.id is item?.id

    @_focused[collection] = item
    @_keyboardCursor[collection] = item if item

    @trigger({ impactsCollection: (c) -> c is collection })

  _onWorkspaceChange: =>
    keyboardCursorEnabled = WorkspaceStore.layoutMode() is 'list'

    if keyboardCursorEnabled isnt @_keyboardCursorEnabled
      @_keyboardCursorEnabled = keyboardCursorEnabled

      if keyboardCursorEnabled
        for collection, item of @_focused
          @_keyboardCursor[collection] = item
        @_focused = {}
      else
        for collection, item of @_keyboardCursor
          @_onFocus({collection, item})

    @trigger({ impactsCollection: -> true })

  # Public Methods

  ###
  Public: Returns the focused {Model} in the collection specified,
  or undefined if no item is focused.

  - `collection` The {String} name of a collection. Standard collections are
    listed above.
  ###
  focused: (collection) =>
    @_focused[collection]

  ###
  Public: Returns the ID of the focused {Model} in the collection specified,
  or undefined if no item is focused.

  - `collection` The {String} name of a collection. Standard collections are
    listed above.
  ###
  focusedId: (collection) =>
    @_focused[collection]?.id

  ###
  Public: Returns the {Model} the keyboard is currently focused on
  in the collection specified. Keyboard focus is not always separate from
  primary focus (selection). You can use {::keyboardCursorEnabled} to determine
  whether keyboard focus is enabled.

  - `collection` The {String} name of a collection. Standard collections are
    listed above.
  ###
  keyboardCursor: (collection) =>
    @_keyboardCursor[collection]

  ###
  Public: Returns the ID of the {Model} the keyboard is currently focused on
  in the collection specified. Keyboard focus is not always separate from
  primary focus (selection). You can use {::keyboardCursorEnabled} to determine
  whether keyboard focus is enabled.

  - `collection` The {String} name of a collection. Standard collections are
    listed above.
  ###
  keyboardCursorId: (collection) =>
    @_keyboardCursor[collection]?.id

  ###
  Public: Returns a {Boolean} - `true` if the keyboard cursor concept applies in
  the current {WorkspaceStore} layout mode. The keyboard cursor is currently only
  enabled in `list` mode.
  ###
  keyboardCursorEnabled: =>
    @_keyboardCursorEnabled


module.exports = new FocusedContentStore()

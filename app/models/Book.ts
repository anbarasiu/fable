import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"

/**
 * This represents an episode of React Native Radio.
 */
export const BookModel = types
  .model("Book")
  .props({
    guid: types.identifier,
    title: "",
    file_name: "",
    author: "",
    cover: ""
  })
  .actions(withSetPropAction)

export interface Book extends Instance<typeof BookModel> {}
export interface BookSnapshotOut extends SnapshotOut<typeof BookModel> {}
export interface BookSnapshotIn extends SnapshotIn<typeof BookModel> {}

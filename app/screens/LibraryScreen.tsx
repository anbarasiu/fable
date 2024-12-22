import { observer } from "mobx-react-lite"
import { ComponentType, FC, useCallback, useEffect, useMemo, useState } from "react"
import {
  AccessibilityProps,
  ActivityIndicator,
  Image,
  ImageStyle,
  Platform,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { type ContentStyle } from "@shopify/flash-list"
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import {
  Button,
  ButtonAccessoryProps,
  Card,
  EmptyState,
  Icon,
  ListView,
  Screen,
  Switch,
  Text,
} from "@/components"
import { useStores } from "../models"
import { Book } from "../models/Book"
import { DemoTabScreenProps } from "../navigators/DemoNavigator"
import type { ThemedStyle } from "@/theme"
import { $styles } from "../theme"
import { delay } from "../utils/delay"
import { useAppTheme } from "@/utils/useAppTheme"

const ICON_SIZE = 14

export const LibraryScreen: FC<DemoTabScreenProps<"LibraryList">> = observer(
  function LibraryScreen({navigation}: any) {
    const { bookStore } = useStores()
    const { themed } = useAppTheme()

    const [refreshing, setRefreshing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // initially, kick off a background refresh without the refreshing UI
    useEffect(() => {
      ;(async function load() {
        setIsLoading(true)
        await bookStore.fetchBooks()
        setIsLoading(false)
      })()
    }, [bookStore])

    // simulate a longer refresh, if the refresh is too fast for UX
    async function manualRefresh() {
      setRefreshing(true)
      await Promise.all([bookStore.fetchBooks(), delay(750)])
      setRefreshing(false)
    }

    const handlePressCard = (book: Book) => {
      navigation.navigate("Reader", { bookPath: book.file_name })
    }

    return (
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$styles.flex1}>
        <ListView<Book>
          contentContainerStyle={themed([$styles.container, $listContentContainer])}
          data={bookStore.booksForList.slice()}
          extraData={bookStore.favorites.length + bookStore.books.length}
          refreshing={refreshing}
          estimatedItemSize={177}
          onRefresh={manualRefresh}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator />
            ) : (
              <EmptyState
                preset="generic"
                style={themed($emptyState)}
                heading={bookStore.favoritesOnly ? "No favorites found" : undefined}
                content={bookStore.favoritesOnly ? "You haven't favorited any books yet" : undefined}
                button={bookStore.favoritesOnly ? "" : undefined}
                buttonOnPress={manualRefresh}
                imageStyle={$emptyStateImage}
                ImageProps={{ resizeMode: "contain" }}
              />
            )
          }
          ListHeaderComponent={
            <View style={themed($heading)}>
              <Text preset="heading" text="Library" />
              {(bookStore.favoritesOnly || bookStore.booksForList.length > 0) && (
                <View style={themed($toggle)}>
                  <Switch
                    value={bookStore.favoritesOnly}
                    onValueChange={() =>
                      bookStore.setProp("favoritesOnly", !bookStore.favoritesOnly)
                    }
                    label="Only Favorites"
                    labelPosition="left"
                    labelStyle={$labelStyle}
                    accessibilityLabel="Toggle favorites only"
                  />
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <BookCard
              book={item}
              isFavorite={bookStore.hasFavorite(item)}
              onPressFavorite={() => bookStore.toggleFavorite(item)}
              onPressCard = {handlePressCard}
            />
          )}
        />
      </Screen>
    )
  },
)

const BookCard = observer(function BookCard({
  book,
  isFavorite,
  onPressFavorite,
  onPressCard
}: {
  book: Book
  onPressFavorite: () => void,
  onPressCard: (book: Book) => void,
  isFavorite: boolean
}) {
  const {
    theme: { colors },
    themed,
  } = useAppTheme()

  const liked = useSharedValue(isFavorite ? 1 : 0)

  // Grey heart
  const animatedLikeButtonStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(liked.value, [0, 1], [1, 0], Extrapolation.EXTEND),
        },
      ],
      opacity: interpolate(liked.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    }
  })

  // Pink heart
  const animatedUnlikeButtonStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: liked.value,
        },
      ],
      opacity: liked.value,
    }
  })

  const handlePressFavorite = useCallback(() => {
    onPressFavorite()
    liked.value = withSpring(liked.value ? 0 : 1)
  }, [liked, onPressFavorite])

  /**
   * Android has a "longpress" accessibility action. iOS does not, so we just have to use a hint.
   * @see https://reactnative.dev/docs/accessibility#accessibilityactions
   */
  const accessibilityHintProps = useMemo(
    () =>
      Platform.select<AccessibilityProps>({
        ios: {
          accessibilityLabel: book.title,
          accessibilityHint: `Long press to ${isFavorite ? "unfavorite" : "favorite"} this book`,
        },
        android: {
          accessibilityLabel: book.title,
          accessibilityActions: [
            {
              name: "longpress",
              label: "Toggle favorite",
            },
          ],
          onAccessibilityAction: ({ nativeEvent }) => {
            if (nativeEvent.actionName === "longpress") {
              handlePressFavorite()
            }
          },
        },
      }),
    [book.title, handlePressFavorite, isFavorite],
  )

  const ButtonLeftAccessory: ComponentType<ButtonAccessoryProps> = useMemo(
    () =>
      function ButtonLeftAccessory() {
        return (
          <View>
            <Animated.View
              style={[
                $styles.row,
                themed($iconContainer),
                StyleSheet.absoluteFill,
                animatedLikeButtonStyles,
              ]}
            >
              <Icon
                icon="heart"
                size={ICON_SIZE}
                color={colors.palette.neutral800} // dark grey
              />
            </Animated.View>
            <Animated.View
              style={[$styles.row, themed($iconContainer), animatedUnlikeButtonStyles]}
            >
              <Icon
                icon="heart"
                size={ICON_SIZE}
                color={colors.palette.primary400} // pink
              />
            </Animated.View>
          </View>
        )
      },
    [animatedLikeButtonStyles, animatedUnlikeButtonStyles, colors, themed],
  )

  return (
    <Card
      style={themed($item)}
      verticalAlignment="force-footer-bottom"
      onPress={() => onPressCard(book)}
      onLongPress={handlePressFavorite}
      HeadingComponent={
        <View style={[$styles.row, themed($metadata)]}>
          <Text
            style={themed($metadataText)}
            size="xxs"
          >
            {'10%'}
          </Text>
          <Text
            style={themed($metadataText)}
            size="xxs"
            accessibilityLabel={'What goes'}
          >
            {'What goes'}
          </Text>
        </View>
      }
      ContentComponent={
      <>
      <Text>{book.title}</Text>
      <Text
        style={themed($metadataText)}
        size="xxs"
        accessibilityLabel={'What goes'}
      >
        {book.author}
      </Text></>}
      {...accessibilityHintProps}
      RightComponent={
        <Image src={book.cover} style={themed($itemThumbnail)} />
      }
      FooterComponent={
        <Button
          onPress={handlePressFavorite}
          onLongPress={handlePressFavorite}
          style={themed([$favoriteButton, isFavorite && $unFavoriteButton])}
          accessibilityLabel={
            isFavorite
              ? "Unfavorite"
              : "Favorite"
          }
          LeftAccessory={ButtonLeftAccessory}
        >
          <Text
            size="xxs"
            weight="medium"
            text={
              isFavorite
                ? "Unfavorite"
                : "Favorite"
            }
          />
        </Button>
      }
    />
  )
})

// #region Styles
const $listContentContainer: ThemedStyle<ContentStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg + spacing.xl,
  paddingBottom: spacing.lg,
})

const $heading: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $item: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
  marginTop: spacing.md,
  minHeight: 120,
  backgroundColor: colors.palette.neutral100,
})

const $itemThumbnail: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
  borderRadius: 5,
  alignSelf: "center",
  width: 40, 
  height: 64
})

const $toggle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

const $labelStyle: TextStyle = {
  textAlign: "left",
}

const $iconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: ICON_SIZE,
  width: ICON_SIZE,
  marginEnd: spacing.sm,
})

const $metadata: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xs,
})

const $metadataText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginEnd: spacing.md,
  marginBottom: spacing.xs,
})

const $favoriteButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 17,
  marginTop: spacing.md,
  justifyContent: "flex-start",
  backgroundColor: colors.palette.neutral300,
  borderColor: colors.palette.neutral300,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.xxxs,
  paddingBottom: 0,
  minHeight: 32,
  alignSelf: "flex-start",
})

const $unFavoriteButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.palette.primary100,
  backgroundColor: colors.palette.primary100,
})

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xxl,
})

const $emptyStateImage: ImageStyle = {
  transform: [{ scaleX: 1 }],
}
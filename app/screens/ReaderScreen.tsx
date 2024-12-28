import { Icon, Screen, Text } from "@/components"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { Reader, ReaderProvider } from '@epubjs-react-native/core'
import { useFileSystem } from "@epubjs-react-native/expo-file-system"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, SafeAreaView, View, ViewStyle } from "react-native"
import { WebViewMessageEvent } from "react-native-webview"
import { $styles } from "../theme"
import { useStores } from "@/models"

// interface ReaderScreenProps {
// 	navigation: NavigationProp
// 	route: RouteProp
// }

export function ReaderScreen({ navigation, route }: any) {
	const {
		theme: { colors },
		themed,
	} = useAppTheme();

	const { book } = route.params
	const { bookStore } = useStores()

	const [selectedText, setSelectedText] = useState("")
	const [isDrawerOpen, setDrawerOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

	// Setup header buttons
	useEffect(() => {
		navigation.setOptions({

			headerRight: () => (
				<View style={themed($headerButtons)}>
					<Icon
						icon="ladybug"
						size={20}
						color={colors.text}
						onPress={handleTranslate}
						containerStyle={themed($headerIcon)}
					/>
					<Icon
						icon="menu"
						size={20}
						color={colors.text}
						onPress={() => setDrawerOpen(!isDrawerOpen)}
						containerStyle={themed($headerIcon)}
					/>
				</View>
			),
		})
	}, [isDrawerOpen, selectedText])


    // Fetch the book path on load
    useEffect(() => {
		(async function load() {
		  await bookStore.fetchBook(book)
		  setIsLoading(false)
		})()
	  }, [bookStore])
  

	const handleMessage = useCallback((event: WebViewMessageEvent) => {
		const data = JSON.parse(event.nativeEvent.data)
		switch (data.type) {
			case "selected":
				setSelectedText(data.selected);
				break;
		}
	}, [])

	const handleTranslate = useCallback(() => {
		if (selectedText) {
			navigation.navigate("Dictionary", { text: selectedText })
		}
	}, [selectedText])

	return (
		<Screen
			preset="fixed"
			safeAreaEdges={["top"]}
			contentContainerStyle={$styles.flex1}
		>
			<ReaderProvider>
				<SafeAreaView style={{ flex: 1 }}>
					{isLoading ? <ActivityIndicator /> :  <Reader
						src={bookStore.bookPath}
						fileSystem={useFileSystem}
						onReady = {(e) => {console.log("Ready", e)}}
						onLocationsReady = {(e) => {console.log("Started", e)}}
						onDisplayError={(e) => {console.log("Error loading", e)}}
						flow="paginated"
					/>}
				</SafeAreaView>
			</ReaderProvider>
		</Screen>
	)
}

const $headerButtons: ThemedStyle<ViewStyle> = () => ({
	flexDirection: "row",
	alignItems: "center",
})

const $headerIcon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
	marginLeft: spacing.sm,
	padding: spacing.xs,
})

const $footer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
	flexDirection: "row",
	justifyContent: "space-between",
	padding: spacing.md,
	backgroundColor: colors.background,
	borderTopWidth: 1,
	borderTopColor: colors.border,
})
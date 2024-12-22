import { Icon, Screen, Text } from "@/components"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { Reader, ReaderProvider } from '@epubjs-react-native/core'
import { useFileSystem } from "@epubjs-react-native/expo-file-system"
import { useCallback, useEffect, useState } from "react"
import { Platform, SafeAreaView, View, ViewStyle } from "react-native"
import { WebViewMessageEvent } from "react-native-webview"
import { $styles } from "../theme"

// interface ReaderScreenProps {
// 	navigation: NavigationProp
// 	route: RouteProp
// }

export function ReaderScreen({ navigation, route }: any) {
	const {
		theme: { colors },
		themed,
	} = useAppTheme();

	const { bookPath } = route.params
	const fullBookPath = `file:///android_asset/books/panorama-einer-weltstadt.epub`;
	console.log(fullBookPath)

	const [selectedText, setSelectedText] = useState("")
	const [isDrawerOpen, setDrawerOpen] = useState(false)

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
					<Reader
						src={fullBookPath}
						fileSystem={useFileSystem}
						onReady = {(e) => {console.log("Ready", e)}}
						onLocationsReady = {(e) => {console.log("Started", e)}}
						onDisplayError={(e) => {console.log("Error loading", e)}}
						flow="paginated"
					/>
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
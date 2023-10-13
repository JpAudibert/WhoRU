import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        marginTop: 124,
        flexGrow: 1,
    },

    camera: {
        flex: 0.7,
    },

    confirmation: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",

        marginTop: 40
    },
    
    confirmationContainerText: {
    },

    confirmationText: {
        fontFamily: "Roboto",
        fontSize: 30
    },

    confirmationBox: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",

        marginTop: 40
    },

    confirmationButton: {
        padding: 20,
        borderRadius: 5,
        marginRight: 24,
        backgroundColor: "#37ff8b"
    },

    confirmationButtonNegation: {
        padding: 20,
        borderRadius: 5,
        marginRight: 24,
        backgroundColor: "#E41E46",
    },

    confirmationButtonText: {
        fontFamily: "Roboto",
        fontSize: 30
    }
});
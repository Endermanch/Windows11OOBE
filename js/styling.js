
"use strict";
var CloudExperienceHost;
(function (CloudExperienceHost) {
    var Styling;
    (function (Styling) {
        function getHexStringFromColor(color) {
            function byteHex(num) {
                var hex = num.toString(16);
                if (hex.length === 1) {
                    hex = "0" + hex;
                }
                return hex;
            }
            return "#" + byteHex(color.r) + byteHex(color.g) + byteHex(color.b);
        }
        Styling.getHexStringFromColor = getHexStringFromColor;
        function getThemeColors() {
            return {
                themeAccent: Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.themeAccent),
                themeAccentLight1: Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.themeAccentLight1),
                themeAccentLight2: Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.themeAccentLight2),
                themeAccentLight3: Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.themeAccentLight3),
                themeAccentDark1: Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.themeAccentDark1),
                themeAccentDark2: Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.themeAccentDark2),
                themeAccentDark3: Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.themeAccentDark3),
                themeTextApplication: Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.themeTextApplication),
                themeTextSystem: Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.themeTextSystem),
            };
        }
        Styling.getThemeColors = getThemeColors;
        function getColorFromUserPreference(colorType) {
            var colorType = Math.floor(colorType);
            if (colorType < 0) {
                throw new Error('Invalid colorType passed into Styling.getColorFromUserPreference: ' + colorType + ' is not greater than 0.');
            }
            return Styling.getHexStringFromColor(CloudExperienceHostAPI.UserColorPreference.UserPreferredColors.getColorFromUserPreference(colorType));
        }
        Styling.getColorFromUserPreference = getColorFromUserPreference;
        function getColorsFromUserPreference(colorTypes) {
            var colors = [];
            for (var i = 0; i < colorTypes.length; i++) {
                colors.push(getColorFromUserPreference(colorTypes[i]));
            }
            return colors;
        }
        Styling.getColorsFromUserPreference = getColorsFromUserPreference;
    })(Styling = CloudExperienceHost.Styling || (CloudExperienceHost.Styling = {}));
})(CloudExperienceHost || (CloudExperienceHost = {}));
//# sourceMappingURL=styling.js.map
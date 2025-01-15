import { Text, View } from "react-native";
import { strings } from "../../../../locales/i18n";
import { memo } from "react";
import { Result } from "./Result";
import { useTheme } from "../../../util/theme";
import { createStyles } from "./index.styles";

interface ResultCategoryProps {
    category: string;
    results: {
        url: string;
        name: string;
        type: string;
    }[];
    onSubmit: (url: string) => void;
}

export const ResultCategory: React.FC<ResultCategoryProps> = memo(({ category, results, onSubmit }) => {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    return (
        <View>
          <Text style={styles.category}>{strings(`autocomplete.${category}`)}</Text>
          {results.map((result) => {
            const onPress = () => {
              onSubmit(result.url);
            };

            return <Result key={result.url} result={result} onPress={onPress} />;
          })}
      </View>
    )
});
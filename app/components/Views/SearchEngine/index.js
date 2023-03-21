import { Text, StyleSheet, View, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { OutlinedTextField } from 'react-native-material-textfield';
import { baseStyles, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { connect } from 'react-redux';
import Button from '../../UI/Button';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSearchEngine } from '../../../actions/settings';

const SearchEngine = (props) => {
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState({});
  const [title, setTitle] = useState("");
  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);
  const [showForm, setShowForm] = useState(false);
  const [addedUrls, setAddedUrls] = useState([
    { value: 'https://presearch.com/search?q=%s', key: "Presearch", label: "Presearch" }, 
    { value: 'https://duckduckgo.com/?q=%s', label: 'DuckDuckGo', key: "DuckDuckGo" }
  ]);

  const handleOnAddBtnClick = async () => {
    setMsg({});
    if (!title) {
      setMsg({ title: "Please enter title!" });
      return;
    }
    if (!url) {
      setMsg({ url: "Please enter valid url!" });
      return;
    }
    if (url && !url.includes("%s")) {
      setMsg({ url: "Url must includes %s!" });
      return;
    }
    let engines = JSON.parse(await AsyncStorage.getItem('SearchEngines'));
    let newEngine = [{ label: title, value: url, key: title.trim() }];
    setAddedUrls([...addedUrls, ...newEngine]);

    if (engines) {
      newEngine = [...engines, ...newEngine];
    } 
    AsyncStorage.setItem("SearchEngines", JSON.stringify(newEngine));
    setTitle('');
    setUrl('');
    setShowForm(false);
  }

  const getSearchEngines = async () => {
    let engines = await AsyncStorage.getItem('SearchEngines');
    console.log(engines);
    if (JSON.parse(engines)) {
      setAddedUrls([...addedUrls, ...JSON.parse(engines)])
    }
  }

  useEffect(() => {
    getSearchEngines();
  }, [])

  return (
    <ScrollView keyboardShouldPersistTaps={'always'} contentContainerStyle={styles.scrollView}>
      <View style={styles.wrapper}>
        {showForm ?
          <>
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.back_btn}>
              <MaterialIcons name="keyboard-backspace" size={28} color="black" />
            </TouchableOpacity>
            <View style={styles.formWrapper}>
              <View style={styles.field}>
                <Text style={styles.label}>{strings('search_engine.title')}</Text>
                <OutlinedTextField
                  style={styles.input}
                  autoCapitalize="none"
                  onChangeText={(e) => setTitle(e)}
                  value={title}
                  baseColor={colors.border.default}
                  tintColor={colors.primary.default}
                />
                {msg?.title && <Text style={styles.errorMsg}>{msg?.title}</Text>}
              </View>

              <View style={styles.field}>
                <OutlinedTextField
                  style={styles.input}
                  autoCapitalize="none"
                  placeholder='https://'
                  onChangeText={(e) => setUrl(e)}
                  value={url}
                  baseColor={colors.border.default}
                  tintColor={colors.primary.default}
                />
                <Text style={styles.helperText}>{strings('search_engine.helperText')}</Text>
                {msg?.url && <Text style={styles.errorMsg}>{msg?.url}</Text>}
              </View>
              <View style={styles.btn_container}>
                <Button style={styles.btn} onPress={handleOnAddBtnClick}>
                  <Text style={styles.btnText}>{strings('search_engine.add-engine-btn')}</Text>
                </Button>
              </View>
            </View>
          </>
          :
          <>
            <View style={styles.searchEngines}>
              {addedUrls?.map((x, i) => (
                <RadioBtn
                  onPress={() => props.setSearchEngine(x.value)}
                  selected={props.searchEngine}
                  item={x}
                  styles={styles}
                  key={`engine_${i}`}
                />
              ))}
            </View>
            <View style={styles.lineBreakContainer}>
              <View style={styles.lineBreak} />
            </View>
            <View style={styles.btn_container}>
              <Button style={styles.btn} onPress={() => setShowForm(true)}>
                <Text style={styles.btnText}>{strings('search_engine.submit-btn')}</Text>
              </Button>
            </View>
          </>
        }
      </View>
    </ScrollView>
  )
}
const createStyles = (colors, shadows) =>
  StyleSheet.create({
    wrapper: {
      ...baseStyles.flexGrow,
      backgroundColor: colors.background.default,
      marginHorizontal: 40
    },
    scrollView: {
      ...baseStyles.flexGrow,
    },
    btn_container: {
      height: 45
    },
    btn: {
      backgroundColor: colors.background.default,
      borderWidth: 2,
      borderColor: "#ccc",
      borderRadius: 20,
    },
    btnText: {
      fontSize: 16
    },
    formWrapper: {
      flex: 9,
    },
    field: {
      marginBottom: 20,
      flexDirection: 'column',
    },
    label: {
      color: colors.text.default,
      fontSize: 16,
      marginBottom: 12,
      ...fontStyles.normal,
    },
    errorMsg: {
      color: 'red',
    },
    input: {
      ...fontStyles.normal,
      fontSize: 16,
      paddingTop: 2,
      color: colors.text.default,
    },
    searchEngines: {
      marginTop: 50,
    },
    lineBreakContainer: {
      alignItems: 'center',
      marginVertical: 30
    },
    lineBreak: {
      height: 2,
      width: 150,
      backgroundColor: 'black',
      alignSelfL: 'center'
    },
    back_btn: {
      flex: 1,
      justifyContent: 'center',
    },
    helperText: {
      fontSize: 12
    },
    radioWrapper: {
      flexDirection: 'row',
    },
    radioContainer: {
      borderWidth: 2,
      borderColor: '#ccc',
      width: 20,
      height: 20,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center'
    },
    radioUncheckBtn: {
      width: 10,
      height: 10,
    },
    radioCheckBtn: {
      backgroundColor: 'black',
      borderRadius: 100
    },
    radioLabel: {
      color: colors.text.default,
      fontSize: 16,
      marginBottom: 12,
      marginLeft: 5,
      ...fontStyles.normal,
    }
  })

const mapStateToProps = (state) => ({
  searchEngine: state.settings.searchEngine,
})
const mapDispatchToProps = (dispatch) => ({
  setSearchEngine: (searchEngine) => dispatch(setSearchEngine(searchEngine))
})

export default connect(mapStateToProps, mapDispatchToProps)(SearchEngine);


const RadioBtn = (props) => {
  return (
    <Pressable style={props.styles.radioWrapper} onPress={props?.onPress}>
      <View style={props.styles.radioContainer}>
        <View style={[props.styles.radioUncheckBtn, props?.item?.value === props?.selected && props.styles.radioCheckBtn]} />
      </View>
      <Text style={props.styles.radioLabel}>{props?.item?.label}</Text>
    </Pressable>
  );
}
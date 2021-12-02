package io.metamask.nativeModules;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.bouncycastle.asn1.x9.X9ECParameters;
import org.bouncycastle.crypto.ec.CustomNamedCurves;
import org.bouncycastle.math.ec.ECPoint;

import java.math.BigInteger;
import java.security.InvalidKeyException;

import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;

/**
 * Class used to support SECP256K1 operations
 */
public class SECP256K1 extends ReactContextBaseJavaModule {

  public static final X9ECParameters CURVE_PARAMS = CustomNamedCurves.getByName("secp256k1");

  SECP256K1(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getName() {
    return "SECP256K1";
  }

  /**
  * Takes in a private key and generates a matching public key in string format
  *
  * @param privateKey - raw private key used to generate the public key x & y values
  * @param compressed - boolean to indicate if the public key should be compressed
  * @return String of SECP256K1 public key
  */
  @ReactMethod(isBlockingSynchronousMethod = true)
  public String publicKeyCreate(String privateKey, boolean compressed) throws InvalidKeyException
  {
    if(privateKey.length() != 64)
	    throw new InvalidKeyException("key should be 32 bytes in length");

    BigInteger privateKeyInteger = new BigInteger(privateKey, 16);
    ECPoint point = CURVE_PARAMS.getG().multiply(privateKeyInteger);
	byte[] publicKeyByte = point.getEncoded(compressed);
 	BigInteger publicKey = new BigInteger(1, publicKeyByte);

	return publicKey.toString(16);
  }

  /**
  * This function takes in a 32 byte string representing a SECP256K1 private key and
  * generates the matching public key x & y coordinates that can be used to create a public key.
  *
  * @param privateKey - raw private key used to generate the public key x & y values
  * @return WriteableArray first value is x and second is y coordinates
  */
  @ReactMethod(isBlockingSynchronousMethod = true)
  public WritableArray getPoint(String privateKey) throws InvalidKeyException
  {

  	if(privateKey.length() != 64)
  		throw new InvalidKeyException("key should be 32 bytes in length");

    BigInteger privateKeyInteger = new BigInteger(privateKey, 16);
    ECPoint point = CURVE_PARAMS.getG().multiply(privateKeyInteger);
	ECPoint pointNormalized = point.normalize();

	WritableArray pointArray = Arguments.createArray();
	pointArray.pushString(pointNormalized.getXCoord().toString());
	pointArray.pushString(pointNormalized.getYCoord().toString());

	return pointArray;
  }
}

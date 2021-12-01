package io.metamask.nativeModules;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.bouncycastle.asn1.x9.X9ECParameters;
import org.bouncycastle.crypto.ec.CustomNamedCurves;
import org.bouncycastle.math.ec.ECPoint;

import java.math.BigInteger;

import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;


public class SECP256K1 extends ReactContextBaseJavaModule {
 public static final X9ECParameters CURVE_PARAMS = CustomNamedCurves.getByName("secp256k1");

  SECP256K1(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getName() {
    return "SECP256K1";
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public String publicKeyCreate(String privateKey, boolean compressed)
  {

    BigInteger privateKeyInteger = new BigInteger(privateKey, 16);
    ECPoint point = CURVE_PARAMS.getG().multiply(privateKeyInteger);
	byte[] publicKeyByte = point.getEncoded(compressed);
 	BigInteger publicKey = new BigInteger(1, publicKeyByte);

	return publicKey.toString(16);
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public WritableArray getPoint(String privateKey, boolean compressed)
  {

    BigInteger privateKeyInteger = new BigInteger(privateKey, 16);
    ECPoint point = CURVE_PARAMS.getG().multiply(privateKeyInteger);
	ECPoint pointNormalized = point.normalize();

	WritableArray pointArray = Arguments.createArray();

	pointArray.pushString(pointNormalized.getXCoord().toString());
	pointArray.pushString(pointNormalized.getYCoord().toString());
	return pointArray;
  }
}

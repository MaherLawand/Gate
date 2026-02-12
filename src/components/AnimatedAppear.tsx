// import { useEffect, useRef } from "react";
// import { Animated, Easing } from "react-native";

// type Props = {
//   children: React.ReactNode;
//   delay?: number;
// };

// export default function AnimatedAppear({ children, delay = 0 }: Props) {
//   const anim = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.timing(anim, {
//       toValue: 1,
//       duration: 340,
//       delay,
//       easing: Easing.out(Easing.cubic),
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   return (
//     <Animated.View
//       style={{
//         opacity: anim,
//         transform: [
//           {
//             translateY: anim.interpolate({
//               inputRange: [0, 1],
//               outputRange: [20, 0],
//             }),
//           },
//         ],
//       }}
//     >
//       {children}
//     </Animated.View>
//   );
// }


//check this out later
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

type Props = {
  children: React.ReactNode;
  delay?: number;
};

export default function AnimatedAppear({ children, delay = 0 }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: 340,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      anim.stopAnimation();
    };
  }, [anim, delay]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
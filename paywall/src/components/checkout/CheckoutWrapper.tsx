import React from 'react'
import styled from 'styled-components'
import Close from '../interface/buttons/layout/Close'
import Media from '../../theme/media'

interface WrapperProps {
  children: any
  hideCheckout: (...args: any[]) => any
  allowClose: boolean
  bgColor?: string
  onClick?: (event: any) => void
}

interface WrapperStyleProps {
  bgColor: string
}

const CheckoutWrapper = ({
  children,
  hideCheckout,
  bgColor = 'var(--offwhite)',
  onClick = () => {},
  allowClose = true,
}: WrapperProps) => {
  return (
    <Wrapper bgColor={bgColor} onClick={allowClose ? onClick : () => {}}>
      {allowClose ? (
        <CloseButton
          backgroundColor="var(--lightgrey)"
          fillColor="var(--grey)"
          onClick={hideCheckout}
        />
      ) : (
        ''
      )}
      {children}
    </Wrapper>
  )
}

export default CheckoutWrapper

const CloseButton = styled(Close).attrs(() => ({
  className: 'closeButton',
}))`
  position: absolute;
  top: 24px;
  right: 24px;
`

const Wrapper = styled.section`
  padding: 10px 40px;
  display: flex;
  flex-direction: column;
  background-color: ${(props: WrapperStyleProps) => props.bgColor};
  color: var(--darkgrey);
  border-radius: 4px;
  position: relative;
  ${Media.nophone`
    width: 600px;
  `}
  ${Media.phone`
    width: 100%;
  `}
`

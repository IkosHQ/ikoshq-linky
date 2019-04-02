jest.mock('../lib/linky')
const { run } = require('../cli')

const withMockedLinkyEnv = (value, fn) => {
  process.env.LINKY_ENV = value
  fn()
  delete process.env.LINKY_ENV
}

const withMockedNodeEnv = (value, fn) => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV
  process.env.NODE_ENV = value
  fn()
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
}

describe('run', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  describe('when LINKY_ENV is set', () => {
    it('should always use LINKY_ENV as the env', () => {
      const linky = require('../lib/linky')
      const linky_env_value = 'linky_env' // this should win
      const node_env_value = 'production' // competing value should lose

      withMockedLinkyEnv(linky_env_value, () => {
        withMockedNodeEnv(node_env_value, () => {
          run()
          expect(linky).toHaveBeenCalledTimes(1)
          expect(linky).toHaveBeenCalledWith(expect.anything(), linky_env_value)
        })
      })
    })
  })
  describe('when LINKY_ENV is not set', () => {
    describe('when NODE_ENV is set', () => {
      it('should use NODE_ENV as the env', () => {
        const linky = require('../lib/linky')
        const node_env_value = 'node_env'
        
        withMockedNodeEnv(node_env_value, () => {
          run()
          expect(linky).toHaveBeenCalledTimes(1)
          expect(linky).toHaveBeenCalledWith(expect.anything(), node_env_value)
        })
      })
    })
    describe('when NODE_ENV is not set', () => {
      it('should use development as the env', () => {
        const linky = require('../lib/linky')
        withMockedNodeEnv('', () => {
          run()
          expect(linky).toHaveBeenCalledTimes(1)
          expect(linky).toHaveBeenCalledWith(expect.anything(), 'development')
        })
      })
    })
  })
})
